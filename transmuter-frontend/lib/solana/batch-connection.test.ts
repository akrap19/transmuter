import { describe, expect, it, vi } from "vitest";
import type { AccountInfo, Connection } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { decodeMintSupply, decodeTokenAmount, getBatchedConnection } from "./batch-connection";

function accountInfo(data: Buffer, lamports = 0): AccountInfo<Buffer> {
  return { data, lamports, owner: PublicKey.default, executable: false, rentEpoch: 0 };
}

describe("getBatchedConnection", () => {
  it("collapses account reads issued in one tick into a single getMultipleAccounts call", async () => {
    const a = PublicKey.unique();
    const b = PublicKey.unique();
    const infoA = accountInfo(Buffer.alloc(80), 1);
    const getMultipleAccountsInfoAndContext = vi.fn().mockResolvedValue({
      context: { slot: 7 },
      value: [infoA, null],
    });
    const connection = { getMultipleAccountsInfoAndContext } as unknown as Connection;

    const batched = getBatchedConnection(connection);
    const [first, second, third] = await Promise.all([
      batched.getAccountInfoAndContext(a),
      batched.getAccountInfo(b),
      batched.getAccountInfo(a),
    ]);

    expect(getMultipleAccountsInfoAndContext).toHaveBeenCalledTimes(1);
    expect(getMultipleAccountsInfoAndContext.mock.calls[0][0]).toHaveLength(2);
    expect(first).toEqual({ context: { slot: 7 }, value: infoA });
    expect(second).toBeNull();
    expect(third).toBe(infoA);
  });

  it("caches one wrapper per underlying connection", () => {
    const connection = { getMultipleAccountsInfoAndContext: vi.fn() } as unknown as Connection;
    expect(getBatchedConnection(connection)).toBe(getBatchedConnection(connection));
  });
});

describe("decodeTokenAmount", () => {
  it("reads the u64 amount at offset 64", () => {
    const data = Buffer.alloc(72);
    data.writeBigUInt64LE(BigInt(1_234_567), 64);
    expect(decodeTokenAmount(accountInfo(data))).toBe(BigInt(1_234_567));
  });

  it("treats a missing account as zero", () => {
    expect(decodeTokenAmount(null)).toBe(BigInt(0));
  });
});

describe("decodeMintSupply", () => {
  it("reads the u64 supply at offset 36", () => {
    const data = Buffer.alloc(44);
    data.writeBigUInt64LE(BigInt(9_000), 36);
    expect(decodeMintSupply(accountInfo(data))).toBe(BigInt(9_000));
  });

  it("treats a missing mint as zero", () => {
    expect(decodeMintSupply(null)).toBe(BigInt(0));
  });
});
