import { describe, expect, it } from "vitest";
import { encodeBase58 } from "./base58.ts";
import { createAccountHydrator, decodeLaunchAccount, LAUNCH_DISC, mapFactoryStatus } from "./hydrate.ts";

function pubkey(seed: number): { bytes: Buffer; base58: string } {
  const bytes = Buffer.alloc(32, seed);
  return { bytes, base58: encodeBase58(bytes) };
}

function encodeString(value: string): Buffer {
  const body = Buffer.from(value, "utf8");
  const head = Buffer.alloc(4);
  head.writeUInt32LE(body.length);
  return Buffer.concat([head, body]);
}

function encodeLaunch(args: {
  mint: Buffer;
  creator: Buffer;
  eol: Buffer;
  backing: Buffer;
  status: number;
  timestamp: bigint;
  targetRaise: bigint;
  name: string;
  symbol: string;
}): Buffer {
  const buf = Buffer.alloc(544);
  LAUNCH_DISC.copy(buf, 0);
  args.creator.copy(buf, 16);
  args.mint.copy(buf, 48);
  args.eol.copy(buf, 80);
  args.backing.copy(buf, 272);
  buf.writeUInt8(args.status, 400);
  buf.writeBigInt64LE(args.timestamp, 405);
  buf.writeBigUInt64LE(args.targetRaise, 447);
  return Buffer.concat([buf, encodeString(args.name), encodeString(args.symbol), Buffer.from([1])]);
}

describe("decodeLaunchAccount", () => {
  it("reads name, symbol, status, and target raise from a Factory Launch account", () => {
    const mint = pubkey(2);
    const creator = pubkey(1);
    const eol = pubkey(3);
    const backing = pubkey(9);
    const data = encodeLaunch({
      mint: mint.bytes,
      creator: creator.bytes,
      eol: eol.bytes,
      backing: backing.bytes,
      status: 2,
      timestamp: 1_700_000_000n,
      targetRaise: 50_000_000n,
      name: "Helix",
      symbol: "HLX",
    });

    expect(decodeLaunchAccount(data)).toEqual({
      mint: mint.base58,
      creator: creator.base58,
      eolConfig: eol.base58,
      backingMint: backing.base58,
      status: "sale",
      launchedAt: 1_700_000_000,
      targetRaiseUsdc: 50_000_000n,
      name: "Helix",
      symbol: "HLX",
    });
  });

  it("returns null for accounts that are not Factory launches", () => {
    expect(decodeLaunchAccount(Buffer.alloc(100))).toBeNull();
  });
});

describe("mapFactoryStatus", () => {
  it("maps Factory status bytes onto catalog statuses including VOIDED", () => {
    expect(mapFactoryStatus(0)).toBe("created");
    expect(mapFactoryStatus(1)).toBe("wired");
    expect(mapFactoryStatus(2)).toBe("sale");
    expect(mapFactoryStatus(3)).toBe("active");
    expect(mapFactoryStatus(4)).toBe("voided");
    expect(mapFactoryStatus(9)).toBeNull();
  });
});

describe("createAccountHydrator", () => {
  it("hydrates a TokenLaunched mint from a matching Launch account", async () => {
    const mint = pubkey(2);
    const creator = pubkey(1);
    const eol = pubkey(3);
    const backing = pubkey(9);
    const data = encodeLaunch({
      mint: mint.bytes,
      creator: creator.bytes,
      eol: eol.bytes,
      backing: backing.bytes,
      status: 2,
      timestamp: 1_700_000_000n,
      targetRaise: 50_000_000n,
      name: "Helix",
      symbol: "HLX",
    });

    const hydrator = createAccountHydrator({
      getAccounts: async () => [data],
      backingMints: { [backing.base58]: "cSOL" },
    });

    const snapshot = await hydrator.hydrate({
      mint: mint.base58,
      creator: creator.base58,
      eol: eol.base58,
      launchId: 1n,
      accountKeys: ["other", "launch"],
      blockTime: 1_700_000_111,
    });

    expect(snapshot).toMatchObject({
      name: "Helix",
      symbol: "HLX",
      backing: "cSOL",
      status: "sale",
      targetRaiseUsdc: 50_000_000n,
      eolConfig: eol.base58,
    });
  });
});
