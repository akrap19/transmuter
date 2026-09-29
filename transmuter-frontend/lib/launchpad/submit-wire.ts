import { createAssociatedTokenAccountIdempotentInstruction, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  ChainTransactionError,
  describeChainError,
  signSendAndConfirm,
  type ConfirmedTransaction,
  type TransactionSigner,
} from "@/lib/solana/tx";
import type { PreparedWireStep, WireMethod } from "./wire-accounts";

type WireBuilder = {
  accounts: (accounts: Record<string, PublicKey>) => {
    transaction: () => Promise<Transaction>;
  };
};

export type FactoryWireClient = {
  methods: Partial<Record<WireMethod, () => WireBuilder>>;
};

type TxConnection = Parameters<typeof signSendAndConfirm>[0]["connection"];

export async function submitWireStep(input: {
  step: PreparedWireStep;
  factory: FactoryWireClient;
  connection: TxConnection;
  signer: TransactionSigner;
  send?: typeof signSendAndConfirm;
}): Promise<ConfirmedTransaction> {
  const send = input.send ?? signSendAndConfirm;
  try {
    const transaction = await transactionFor(input.step, input.factory);
    return await send({
      connection: input.connection,
      signer: input.signer,
      transaction,
      signers: input.step.signers,
    });
  } catch (error) {
    if (error instanceof ChainTransactionError) throw error;
    const described = describeChainError(error);
    throw new ChainTransactionError(described.message, { code: described.code, cause: error });
  }
}

async function transactionFor(step: PreparedWireStep, factory: FactoryWireClient): Promise<Transaction> {
  if (step.kind === "ata") {
    const tx = new Transaction();
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        step.accounts.payer,
        step.accounts.ata,
        step.accounts.owner,
        step.accounts.mint,
        TOKEN_2022_PROGRAM_ID,
      ),
    );
    return tx;
  }

  const method = step.method;
  const build = method ? factory.methods[method] : undefined;
  if (!method || !build) throw new Error(`Factory client cannot send ${method ?? step.id}.`);
  return build().accounts(step.accounts).transaction();
}
