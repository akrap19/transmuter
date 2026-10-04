import { Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { computeUnitsFor, measureBatch, planWireBatches, type WireStepUnit } from "./wire-batches";
import type { WireStepId } from "./wire-plan";

const feePayer = Keypair.generate().publicKey;

function unit(id: WireStepId, signerCount: number): WireStepUnit {
  const signers = Array.from({ length: signerCount }, () => Keypair.generate());
  const keys = signers.map((signer) => ({ pubkey: signer.publicKey, isSigner: true, isWritable: true }));
  const instruction = new TransactionInstruction({
    programId: Keypair.generate().publicKey,
    keys,
    data: Buffer.alloc(16),
  });
  return { id, instructions: [instruction], signers };
}

describe("planWireBatches", () => {
  it("packs small steps into a single transaction", () => {
    const batches = planWireBatches([unit("eol", 1), unit("staking", 1), unit("dao", 0)], feePayer);

    expect(batches).toHaveLength(1);
    expect(batches[0].stepIds).toEqual(["eol", "staking", "dao"]);
    expect(batches[0].signers).toHaveLength(2);
  });

  it("splits into more transactions once the packet limit is reached", () => {
    const many = [
      unit("eol", 1),
      unit("staking", 1),
      unit("vesting", 2),
      unit("escrow", 1),
      unit("poolUsdc", 2),
      unit("poolSol", 1),
      unit("vaults", 6),
    ];

    const batches = planWireBatches(many, feePayer);

    expect(batches.length).toBeGreaterThan(1);
    // Order is preserved across the split.
    expect(batches.flatMap((batch) => batch.stepIds)).toEqual(many.map((u) => u.id));
    // Every batch fits.
    for (const batch of batches) {
      expect(measureBatch(batch, feePayer)).toBeLessThanOrEqual(1232);
    }
  });

  it("keeps a step that cannot be split with anything else in its own batch", () => {
    const batches = planWireBatches([unit("vaults", 10)], feePayer);
    expect(batches).toHaveLength(1);
    expect(batches[0].stepIds).toEqual(["vaults"]);
  });

  it("respects a tighter custom limit", () => {
    const batches = planWireBatches([unit("eol", 1), unit("staking", 1)], feePayer, 300);
    expect(batches).toHaveLength(2);
  });
});

describe("computeUnitsFor", () => {
  it("grows with step count and caps at the chain maximum", () => {
    expect(computeUnitsFor(1)).toBe(220_000);
    expect(computeUnitsFor(2)).toBe(400_000);
    expect(computeUnitsFor(100)).toBe(1_400_000);
  });
});

describe("measureBatch", () => {
  it("counts signatures and the compute-budget program", () => {
    const small = measureBatch({ stepIds: ["dao"], instructions: [], signers: [] }, feePayer);
    // Just the fee payer signature + compute budget instruction + header + blockhash.
    expect(small).toBeGreaterThan(64);
    expect(small).toBeLessThan(200);
    expect(new PublicKey(feePayer)).toBeInstanceOf(PublicKey);
  });
});
