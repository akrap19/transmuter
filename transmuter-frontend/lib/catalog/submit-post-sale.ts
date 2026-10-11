import { BN } from "@coral-xyz/anchor";
import {
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { ComputeBudgetProgram, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { eolConfigPda, EOL_TOKEN_PROGRAM_ID } from "@/lib/solana/programs/eol-token";
import { factoryMintIndexPda, factoryPda, launchPda } from "@/lib/solana/programs/factory";
import type { AccountMeta } from "@/lib/solana/raydium-cpmm";
import {
  ChainTransactionError,
  describeChainError,
  signSendAndConfirm,
  type ConfirmedTransaction,
  type TransactionSigner,
} from "@/lib/solana/tx";
import { claimPlan, convertPlan, feeRoutePda, finalizePlan, seedRaydiumPlan, settlePlan, type PostSaleAccountsInput } from "./post-sale-accounts";
import { raydiumSeedAmounts, type PostSaleKind } from "./post-sale";

export const FINALIZE_CU = 1_400_000;
export const LP_SIGNER_LAMPORTS = BigInt(2_500_000_000);

/** `settleFees` is a recurring crank for a keeper, not a step of the sale. */
export type SubmitKind = PostSaleKind | "settleFees";

type Built = { transaction: () => Promise<Transaction> };

type IxBuilder = {
  accounts: (accounts: Record<string, PublicKey>) => Built & {
    remainingAccounts: (accounts: AccountMeta[]) => Built;
  };
};

export type EolPostSaleClient = {
  methods: {
    finalize: () => IxBuilder;
    convertTreasury: (maxIn: BN, minOut: BN) => IxBuilder;
    seedRaydiumLp: (amountToken: BN, amountQuote: BN) => IxBuilder;
    claimTokens: () => IxBuilder;
    settleTransferFees: () => IxBuilder;
  };
};

export type FactoryOutcomeClient = {
  methods: {
    syncOutcome: () => IxBuilder;
    initBackingFeeSinks: () => IxBuilder;
    syncFeeRoute: () => IxBuilder;
  };
  account: {
    mintIndex: {
      fetchNullable: (address: PublicKey) => Promise<{ launchId: { toString(): string } } | null>;
    };
  };
};

export type PostSaleChain = PostSaleAccountsInput & {
  lpUsdcShareBps: number;
  lpTokenAtoms: bigint;
  saleUsdcAtoms: bigint;
  wsolAtoms: bigint;
  depositAtoms: bigint;
  /** The connected wallet already took its tokens. Present on a chain read, absent in hand-built fixtures. */
  claimed?: boolean;
  wsolAtaExists: boolean;
  lpSignerLamports: bigint;
  poolsReady: boolean;
  /** Raydium only: the EOL/USDC pool exists, so transfer fees have somewhere to swap. */
  eolPoolReady: boolean;
  feeRouteExists: boolean;
  launchId: bigint | null;
};

type TxConnection = Parameters<typeof signSendAndConfirm>[0]["connection"];

export async function submitPostSale(input: {
  kind: SubmitKind;
  chain: PostSaleChain;
  eol: EolPostSaleClient;
  factory?: FactoryOutcomeClient;
  connection: TxConnection;
  signer: TransactionSigner;
  send?: typeof signSendAndConfirm;
}): Promise<ConfirmedTransaction> {
  const send = input.send ?? signSendAndConfirm;
  try {
    if ((input.kind === "finalize" || input.kind === "convertTreasury") && !input.chain.poolsReady) {
      throw new ChainTransactionError("Pool vaults are not on this launch yet.");
    }
    const transaction = new Transaction();
    if (input.kind !== "claimTokens") {
      transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: FINALIZE_CU }));
    }
    transaction.add(...(await postSaleInstructions(input.kind, input.chain, input.eol, input.factory)));
    return await send({ connection: input.connection, signer: input.signer, transaction });
  } catch (error) {
    if (error instanceof ChainTransactionError) throw error;
    const described = describeChainError(error);
    throw new ChainTransactionError(described.message, { code: described.code, cause: error });
  }
}

export async function postSaleInstructions(
  kind: SubmitKind,
  chain: PostSaleChain,
  eol: EolPostSaleClient,
  factory?: FactoryOutcomeClient,
): Promise<Transaction["instructions"]> {
  if (kind === "claimTokens") {
    const plan = claimPlan({ mint: chain.mint, depositor: chain.cranker, saleTokenVault: chain.saleTokenVault });
    const claim = await compile(eol.methods.claimTokens(), plan.accounts, []);
    return [
      createAssociatedTokenAccountIdempotentInstruction(
        chain.cranker,
        plan.destination,
        chain.cranker,
        chain.mint,
        TOKEN_2022_PROGRAM_ID,
      ),
      ...claim,
    ];
  }

  if (kind === "finalize" || kind === "convertTreasury") {
    const prelude = wsolPrelude(chain);
    if (kind === "finalize") {
      const plan = finalizePlan(chain);
      return [
        ...prelude,
        ...(await compile(eol.methods.finalize(), plan.accounts, plan.remaining)),
        ...(await syncOutcomeIx(factory, chain)),
      ];
    }
    const plan = convertPlan(chain);
    return [
      ...prelude,
      ...(await compile(eol.methods.convertTreasury(new BN(plan.maxIn), new BN(plan.minOut)), plan.accounts, plan.remaining)),
    ];
  }

  if (kind === "settleFees") {
    return settleInstructions(chain, eol, factory);
  }

  const seed = raydiumSeedAmounts(chain);
  const leg = kind === "seedRaydiumUsdc" ? seed.usdc : seed.wsol;
  const quoteMint = kind === "seedRaydiumUsdc" ? chain.usdcMint : NATIVE_MINT;
  const quoteVault = kind === "seedRaydiumUsdc" ? chain.saleUsdcVault : configWsol(chain);
  const plan = seedRaydiumPlan({
    cranker: chain.cranker,
    mint: chain.mint,
    quoteMint,
    quoteVault,
    tokenVault: chain.lpTokenVault,
    amountToken: leg.token,
    amountQuote: leg.quote,
  });
  const built = await compile(
    eol.methods.seedRaydiumLp(new BN(plan.amountToken), new BN(plan.amountQuote)),
    plan.accounts,
    plan.remaining,
  );
  return [...fundLpSigner(chain, plan.lpSigner), ...wsolPrelude(chain), ...built];
}

async function settleInstructions(
  chain: PostSaleChain,
  eol: EolPostSaleClient,
  factory?: FactoryOutcomeClient,
): Promise<Transaction["instructions"]> {
  if (!factory) throw new ChainTransactionError("Factory client is required to settle transfer fees.");
  if (chain.venue === "raydium" && !chain.eolPoolReady) {
    throw new ChainTransactionError("The EOL/USDC pool is not seeded yet, so there is nothing to settle fees through.");
  }
  const plan = settlePlan(chain);
  // The backing fee sinks are created once per protocol by the keeper. Calling init here
  // would fail on every run after the first, so the sale panel does not send it.
  const steps: Transaction["instructions"] = [
    ...(chain.venue === "raydium" ? wsolPrelude(chain) : []),
    createAssociatedTokenAccountIdempotentInstruction(
      chain.cranker,
      plan.creatorAta,
      plan.creatorWallet,
      chain.mint,
      TOKEN_2022_PROGRAM_ID,
    ),
  ];
  if (!chain.feeRouteExists) {
    if (chain.launchId == null) throw new ChainTransactionError("This mint is not in the Factory index.");
    steps.push(
      ...(await compile(
        factory.methods.syncFeeRoute(),
        {
          cranker: chain.cranker,
          factory: factoryPda(),
          launch: launchPda(chain.launchId),
          eolConfig: eolConfigPda(chain.mint),
          feeRoute: feeRoutePda(chain.mint),
          eolProgram: EOL_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        },
        [],
      )),
    );
  }
  steps.push(
    ...(await compile(eol.methods.settleTransferFees(), plan.accounts, [
      ...plan.remaining,
      { pubkey: plan.creatorAta, isSigner: false, isWritable: true },
    ])),
  );
  return steps;
}

async function syncOutcomeIx(factory: FactoryOutcomeClient | undefined, chain: PostSaleChain): Promise<Transaction["instructions"]> {
  if (!factory) throw new ChainTransactionError("Factory client is required to record the sale outcome.");
  const index = await factory.account.mintIndex.fetchNullable(factoryMintIndexPda(chain.mint));
  if (!index) throw new ChainTransactionError("This mint is not in the Factory index.");
  const launch = launchPda(BigInt(index.launchId.toString()));
  return compile(
    factory.methods.syncOutcome(),
    { cranker: chain.cranker, launch, eolConfig: eolConfigPda(chain.mint) },
    [],
  );
}

function wsolPrelude(chain: PostSaleChain) {
  if (chain.wsolAtaExists) return [];
  const ata = configWsol(chain);
  return [
    createAssociatedTokenAccountIdempotentInstruction(chain.cranker, ata, eolConfigPda(chain.mint), NATIVE_MINT, TOKEN_PROGRAM_ID),
  ];
}

function fundLpSigner(chain: PostSaleChain, lpSigner: PublicKey) {
  if (chain.lpSignerLamports >= LP_SIGNER_LAMPORTS) return [];
  return [
    SystemProgram.transfer({
      fromPubkey: chain.cranker,
      toPubkey: lpSigner,
      lamports: Number(LP_SIGNER_LAMPORTS - chain.lpSignerLamports),
    }),
  ];
}

function configWsol(chain: PostSaleChain): PublicKey {
  return getAssociatedTokenAddressSync(NATIVE_MINT, eolConfigPda(chain.mint), true, TOKEN_PROGRAM_ID);
}

async function compile(builder: IxBuilder, accounts: Record<string, PublicKey>, remaining: AccountMeta[]): Promise<Transaction["instructions"]> {
  const withAccounts = builder.accounts(accounts);
  const built = remaining.length > 0 ? await withAccounts.remainingAccounts(remaining).transaction() : await withAccounts.transaction();
  return built.instructions;
}
