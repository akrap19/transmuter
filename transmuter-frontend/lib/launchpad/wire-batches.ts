import {
  ComputeBudgetProgram,
  PublicKey,
  Transaction,
  type Signer,
  type TransactionInstruction,
} from "@solana/web3.js";
import type { WireStepId } from "./wire-plan";

/** One wiring step, already compiled to the instructions and extra signers it needs. */
export type WireStepUnit = {
  id: WireStepId;
  instructions: TransactionInstruction[];
  signers: Signer[];
};

/** A group of steps that fit in a single transaction, i.e. one wallet approval. */
export type WireBatch = {
  stepIds: WireStepId[];
  instructions: TransactionInstruction[];
  signers: Signer[];
};

/** Solana packet limit. A serialized transaction must fit in this many bytes. */
export const PACKET_LIMIT = 1232;
/** Safety margin so a fresh blockhash / signature padding never pushes us over. */
export const SIZE_MARGIN = 48;

const BASE_COMPUTE_UNITS = 220_000;
const COMPUTE_UNITS_PER_EXTRA_STEP = 180_000;
const MAX_COMPUTE_UNITS = 1_400_000;

/** Compute budget for a batch. Each wiring step inits accounts, so cost grows with step count. */
export function computeUnitsFor(stepCount: number): number {
  const units = BASE_COMPUTE_UNITS + COMPUTE_UNITS_PER_EXTRA_STEP * Math.max(0, stepCount - 1);
  return Math.min(MAX_COMPUTE_UNITS, units);
}

/**
 * Greedily pack ordered steps into the fewest transactions that each stay under the
 * packet limit. The caller passes steps in dependency order; packing preserves it, so
 * a batch never runs a step before one it depends on. A single step that is too large on
 * its own is still emitted alone (the chain will reject it, surfacing a real error).
 */
export function planWireBatches(
  units: WireStepUnit[],
  feePayer: PublicKey,
  limit: number = PACKET_LIMIT - SIZE_MARGIN,
): WireBatch[] {
  const batches: WireBatch[] = [];
  let current: WireBatch | null = null;

  for (const unit of units) {
    if (current) {
      const candidate = merge(current, unit);
      if (measureBatch(candidate, feePayer) <= limit) {
        current = candidate;
        continue;
      }
      batches.push(current);
    }
    current = { stepIds: [unit.id], instructions: [...unit.instructions], signers: [...unit.signers] };
  }

  if (current) batches.push(current);
  return batches;
}

function merge(batch: WireBatch, unit: WireStepUnit): WireBatch {
  return {
    stepIds: [...batch.stepIds, unit.id],
    instructions: [...batch.instructions, ...unit.instructions],
    signers: [...batch.signers, ...unit.signers],
  };
}

/** Build the exact transaction a batch becomes, including its compute-budget instruction. */
export function batchTransaction(batch: WireBatch, feePayer: PublicKey): Transaction {
  const transaction = new Transaction();
  transaction.feePayer = feePayer;
  transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitsFor(batch.stepIds.length) }));
  for (const instruction of batch.instructions) transaction.add(instruction);
  return transaction;
}

/** Serialized byte size of the batch, including signatures, using a placeholder blockhash. */
export function measureBatch(batch: WireBatch, feePayer: PublicKey): number {
  const transaction = batchTransaction(batch, feePayer);
  transaction.recentBlockhash = PublicKey.default.toBase58();
  const message = transaction.serializeMessage();
  const numRequiredSignatures = message[0];
  return 1 + numRequiredSignatures * 64 + message.length;
}
