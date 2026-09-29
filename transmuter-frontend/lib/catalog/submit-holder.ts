import { BN } from "@coral-xyz/anchor";
import { createAssociatedTokenAccountIdempotentInstruction, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { ComputeBudgetProgram, PublicKey, Transaction } from "@solana/web3.js";
import {
  ChainTransactionError,
  describeChainError,
  signSendAndConfirm,
  type ConfirmedTransaction,
  type TransactionSigner,
} from "@/lib/solana/tx";
import {
  castVotePlan,
  escrowDrawPlan,
  executeLiquidationPlan,
  openVotePlan,
  redeemPlan,
  stakePlan,
  unstakePlan,
  vestingClaimPlan,
} from "./holder-accounts";

const LIQUIDATION_CU = 1_400_000;

type Built = { transaction: () => Promise<Transaction> };

type IxBuilder = {
  accounts: (accounts: Record<string, PublicKey>) => Built;
};

export type HolderClients = {
  staking: { methods: { stake: (amount: BN) => IxBuilder; unstake: (amount: BN) => IxBuilder } };
  vesting: { methods: { claim: () => IxBuilder } };
  escrow: { methods: { draw: () => IxBuilder } };
  eol: {
    methods: {
      redeem: (amount: BN) => IxBuilder;
      openLiquidationVote: () => IxBuilder;
      castLiquidationVote: (yes: boolean, weight: BN) => IxBuilder;
      executeLiquidation: () => IxBuilder;
    };
  };
};

export type HolderKind =
  | "stake"
  | "unstake"
  | "vestingClaim"
  | "escrowDraw"
  | "redeem"
  | "openLiquidationVote"
  | "castLiquidationVote"
  | "executeLiquidation";

export type HolderSubmit = {
  signer: PublicKey;
  mint: PublicKey;
  decimals: number;
  stakeVault: PublicKey | null;
  vesting: { config: PublicKey; entry: PublicKey; pot: PublicKey } | null;
  escrow: { config: PublicKey; vault: PublicKey } | null;
  ctokenMint: PublicKey;
  treasuryUsdc: PublicKey;
  usdcMint: PublicKey;
  protocolRevenue: PublicKey;
  staking: PublicKey | null;
  vestingSide: { config: PublicKey; teamPot: PublicKey; teamEntry: PublicKey } | null;
  escrowSide: { config: PublicKey; vault: PublicKey } | null;
  weight: bigint;
};

type TxConnection = Parameters<typeof signSendAndConfirm>[0]["connection"];

export async function submitHolder(input: {
  kind: HolderKind;
  amount?: string;
  yes?: boolean;
  chain: HolderSubmit;
  programs: HolderClients;
  connection: TxConnection;
  signer: TransactionSigner;
  send?: typeof signSendAndConfirm;
}): Promise<ConfirmedTransaction> {
  const send = input.send ?? signSendAndConfirm;
  try {
    const transaction = new Transaction();
    if (input.kind === "executeLiquidation" || input.kind === "redeem") {
      transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: LIQUIDATION_CU }));
    }
    transaction.add(...(await instructions(input)));
    return await send({ connection: input.connection, signer: input.signer, transaction });
  } catch (error) {
    if (error instanceof ChainTransactionError) throw error;
    const described = describeChainError(error);
    throw new ChainTransactionError(described.message, { code: described.code, cause: error });
  }
}

async function instructions(input: {
  kind: HolderKind;
  amount?: string;
  yes?: boolean;
  chain: HolderSubmit;
  programs: HolderClients;
}): Promise<Transaction["instructions"]> {
  const { kind, chain, programs } = input;
  if (kind === "stake" || kind === "unstake") {
    if (!chain.stakeVault) throw new ChainTransactionError("Staking is not wired on this launch.");
    const plan =
      kind === "stake"
        ? stakePlan({ owner: chain.signer, mint: chain.mint, vault: chain.stakeVault, decimals: chain.decimals, amount: input.amount ?? "" })
        : unstakePlan({ owner: chain.signer, mint: chain.mint, vault: chain.stakeVault, decimals: chain.decimals, amount: input.amount ?? "" });
    if (!plan) throw new ChainTransactionError("Enter an amount greater than zero.");
    const ix =
      kind === "stake"
        ? await compile(programs.staking.methods.stake(new BN(plan.atoms.toString())), plan.accounts)
        : await compile(programs.staking.methods.unstake(new BN(plan.atoms.toString())), plan.accounts);
    const ata = "source" in plan ? plan.source : plan.destination;
    return [ataIx(chain.signer, ata, chain.signer, chain.mint, TOKEN_2022_PROGRAM_ID), ...ix];
  }

  if (kind === "vestingClaim") {
    if (!chain.vesting) throw new ChainTransactionError("This wallet has no vesting entry.");
    const plan = vestingClaimPlan({ recipient: chain.signer, mint: chain.mint, ...chain.vesting, vestingConfig: chain.vesting.config });
    return [
      ataIx(chain.signer, plan.destination, chain.signer, chain.mint, TOKEN_2022_PROGRAM_ID),
      ...(await compile(programs.vesting.methods.claim(), plan.accounts)),
    ];
  }

  if (kind === "escrowDraw") {
    if (!chain.escrow) throw new ChainTransactionError("Runway escrow is not funded.");
    const plan = escrowDrawPlan({
      teamRecipient: chain.signer,
      usdcMint: chain.usdcMint,
      escrowConfig: chain.escrow.config,
      vault: chain.escrow.vault,
    });
    return [
      ataIx(chain.signer, plan.destination, chain.signer, chain.usdcMint, TOKEN_PROGRAM_ID),
      ...(await compile(programs.escrow.methods.draw(), plan.accounts)),
    ];
  }

  if (kind === "redeem") {
    const plan = redeemPlan({
      user: chain.signer,
      mint: chain.mint,
      ctokenMint: chain.ctokenMint,
      treasuryUsdc: chain.treasuryUsdc,
      usdcMint: chain.usdcMint,
      decimals: chain.decimals,
      amount: input.amount ?? "",
    });
    if (!plan) throw new ChainTransactionError("Enter an amount greater than zero.");
    return [
      ataIx(chain.signer, plan.userEol, chain.signer, chain.mint, TOKEN_2022_PROGRAM_ID),
      ataIx(chain.signer, plan.userUsdc, chain.signer, chain.usdcMint, TOKEN_PROGRAM_ID),
      ...(await compile(programs.eol.methods.redeem(new BN(plan.atoms.toString())), plan.accounts)),
    ];
  }

  if (kind === "openLiquidationVote") {
    return compile(programs.eol.methods.openLiquidationVote(), openVotePlan({ cranker: chain.signer, mint: chain.mint }));
  }

  if (kind === "castLiquidationVote") {
    const plan = castVotePlan({
      voter: chain.signer,
      mint: chain.mint,
      staking: chain.staking,
      yes: input.yes === true,
      weight: chain.weight,
    });
    if (plan.weight <= BigInt(0)) throw new ChainTransactionError("Snapshot weight is zero. Stake before the vote opens.");
    return compile(programs.eol.methods.castLiquidationVote(plan.yes, new BN(plan.weight.toString())), plan.accounts);
  }

  const plan = executeLiquidationPlan({
    cranker: chain.signer,
    mint: chain.mint,
    ctokenMint: chain.ctokenMint,
    treasuryUsdc: chain.treasuryUsdc,
    protocolRevenue: chain.protocolRevenue,
    staking: chain.staking,
    vesting: chain.vestingSide,
    escrow: chain.escrowSide,
  });
  return compile(programs.eol.methods.executeLiquidation(), plan);
}

function ataIx(payer: PublicKey, ata: PublicKey, owner: PublicKey, mint: PublicKey, program: PublicKey) {
  return createAssociatedTokenAccountIdempotentInstruction(payer, ata, owner, mint, program);
}

async function compile(builder: IxBuilder, accounts: Record<string, PublicKey>): Promise<Transaction["instructions"]> {
  const built = await builder.accounts(accounts).transaction();
  return built.instructions;
}
