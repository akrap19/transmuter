import { BN } from "@coral-xyz/anchor";
import { createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import { PublicKey, Transaction } from "@solana/web3.js";
import { eolConfigPda } from "@/lib/solana/programs/eol-token";
import { TOKEN_PROGRAM_ID } from "@/lib/solana/spl-token";
import {
  ChainTransactionError,
  describeChainError,
  signSendAndConfirm,
  type ConfirmedTransaction,
  type TransactionSigner,
} from "@/lib/solana/tx";
import { saleAccounts, usdcToAtoms } from "./sale-accounts";

type SaleBuilder = {
  accounts: (accounts: Record<string, PublicKey>) => {
    transaction: () => Promise<Transaction>;
  };
};

export type EolSaleClient = {
  methods: {
    deposit: (amount: BN) => SaleBuilder;
    withdraw: (amount: BN) => SaleBuilder;
  };
  account: {
    config: {
      fetch: (address: PublicKey) => Promise<{ saleUsdcVault: PublicKey; usdcMint: PublicKey }>;
    };
    deposit: {
      fetch: (address: PublicKey) => Promise<{ amount: { toString(): string } }>;
    };
  };
};

type TxConnection = Parameters<typeof signSendAndConfirm>[0]["connection"];

export async function submitSale(input: {
  kind: "deposit" | "withdraw";
  amount?: string;
  mint: PublicKey;
  depositor: PublicKey;
  eol: EolSaleClient;
  connection: TxConnection;
  signer: TransactionSigner;
  send?: typeof signSendAndConfirm;
}): Promise<ConfirmedTransaction> {
  const send = input.send ?? signSendAndConfirm;
  try {
    if (input.kind === "deposit") {
      const atoms = usdcToAtoms(input.amount ?? "");
      if (atoms == null) throw new ChainTransactionError("Enter a USDC amount greater than zero.");
    }

    const configPda = eolConfigPda(input.mint);
    const config = await input.eol.account.config.fetch(configPda);
    const accounts = saleAccounts({
      mint: input.mint,
      depositor: input.depositor,
      usdcMint: config.usdcMint,
      saleUsdcVault: config.saleUsdcVault,
    });
    const atoms =
      input.kind === "deposit"
        ? usdcToAtoms(input.amount ?? "")
        : BigInt((await input.eol.account.deposit.fetch(accounts.deposit)).amount.toString());
    if (atoms == null || atoms <= BigInt(0)) {
      throw new ChainTransactionError(
        input.kind === "deposit" ? "Enter a USDC amount greater than zero." : "No USDC deposit to withdraw.",
      );
    }

    const built = await (input.kind === "deposit" ? input.eol.methods.deposit : input.eol.methods.withdraw)(
      new BN(atoms.toString()),
    )
      .accounts(instructionAccounts(input.kind, accounts))
      .transaction();

    const transaction = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(
        input.depositor,
        accounts.userUsdc,
        input.depositor,
        config.usdcMint,
        TOKEN_PROGRAM_ID,
      ),
      ...built.instructions,
    );

    return await send({
      connection: input.connection,
      signer: input.signer,
      transaction,
    });
  } catch (error) {
    if (error instanceof ChainTransactionError) throw error;
    const described = describeChainError(error);
    throw new ChainTransactionError(described.message, { code: described.code, cause: error });
  }
}

function instructionAccounts(
  kind: "deposit" | "withdraw",
  accounts: ReturnType<typeof saleAccounts>,
): Record<string, PublicKey> {
  const shared = {
    depositor: accounts.depositor,
    config: accounts.config,
    saleUsdcVault: accounts.saleUsdcVault,
    deposit: accounts.deposit,
    usdcProgram: accounts.usdcProgram,
  };
  if (kind === "deposit") {
    return { ...shared, source: accounts.userUsdc, systemProgram: accounts.systemProgram };
  }
  return { ...shared, destination: accounts.userUsdc };
}
