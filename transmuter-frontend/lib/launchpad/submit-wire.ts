import { createAssociatedTokenAccountIdempotentInstruction, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, Transaction, type TransactionInstruction } from "@solana/web3.js";
import {
  ChainTransactionError,
  describeChainError,
  signSendAndConfirm,
  type ConfirmedTransaction,
  type TransactionSigner,
} from "@/lib/solana/tx";
import { batchTransaction, type WireBatch, type WireStepUnit } from "./wire-batches";
import type { PreparedWireStep, WireMethod } from "./wire-accounts";

type WireBuilder = {
  accounts: (accounts: Record<string, PublicKey>) => {
    transaction: () => Promise<Transaction>;
    instruction: () => Promise<TransactionInstruction>;
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
    for (const instruction of await buildStepInstructions(step, factory)) tx.add(instruction);
    return tx;
  }

  const method = step.method;
  const build = method ? factory.methods[method] : undefined;
  if (!method || !build) throw new Error(`Factory client cannot send ${method ?? step.id}.`);
  return build().accounts(step.accounts).transaction();
}

/** Compile one wiring step to the instruction(s) it contributes to a batched transaction. */
export async function buildStepInstructions(
  step: PreparedWireStep,
  factory: FactoryWireClient,
): Promise<TransactionInstruction[]> {
  if (step.kind === "ata") {
    return [
      createAssociatedTokenAccountIdempotentInstruction(
        step.accounts.payer,
        step.accounts.ata,
        step.accounts.owner,
        step.accounts.mint,
        TOKEN_2022_PROGRAM_ID,
      ),
    ];
  }

  const method = step.method;
  const build = method ? factory.methods[method] : undefined;
  if (!method || !build) throw new Error(`Factory client cannot send ${method ?? step.id}.`);
  return [await build().accounts(step.accounts).instruction()];
}

/** Compile prepared steps into batching units (instructions + extra signers per step). */
export async function buildWireUnits(
  steps: PreparedWireStep[],
  factory: FactoryWireClient,
): Promise<WireStepUnit[]> {
  const units: WireStepUnit[] = [];
  for (const step of steps) {
    units.push({ id: step.id, instructions: await buildStepInstructions(step, factory), signers: step.signers });
  }
  return units;
}

/** Send one batch (several wiring steps) as a single transaction: one wallet approval. */
export async function submitWireBatch(input: {
  batch: WireBatch;
  feePayer: PublicKey;
  connection: TxConnection;
  signer: TransactionSigner;
  send?: typeof signSendAndConfirm;
}): Promise<ConfirmedTransaction> {
  const send = input.send ?? signSendAndConfirm;
  try {
    return await send({
      connection: input.connection,
      signer: input.signer,
      transaction: batchTransaction(input.batch, input.feePayer),
      signers: input.batch.signers,
    });
  } catch (error) {
    if (error instanceof ChainTransactionError) throw error;
    const described = describeChainError(error);
    throw new ChainTransactionError(described.message, { code: described.code, cause: error });
  }
}
