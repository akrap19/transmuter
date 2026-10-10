import { describe, expect, it } from "vitest";
import { encodeBase58 } from "./base58.ts";
import {
  basketFromCreateInstruction,
  CREATE_LAUNCH_DISC,
  createAccountHydrator,
  decodeLaunchAccount,
  LAUNCH_DISC,
  mapFactoryStatus,
} from "./hydrate.ts";

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
  metadataUri?: string;
  basket?: Array<{ assetKind: number; weightBps: number }>;
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
  const parts = [
    buf,
    encodeString(args.name),
    encodeString(args.symbol),
    encodeString(args.metadataUri ?? ""),
    Buffer.from([1]),
  ];
  if (args.basket) {
    const legs = Buffer.alloc(args.basket.length * 3);
    args.basket.forEach((leg, i) => {
      legs.writeUInt8(leg.assetKind, i * 3);
      legs.writeUInt16LE(leg.weightBps, i * 3 + 1);
    });
    parts.push(legs);
  }
  return Buffer.concat(parts);
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
      metadataUri: "https://cdn.example/hlx.json",
      basket: [
        { assetKind: 0, weightBps: 6000 },
        { assetKind: 1, weightBps: 0 },
        { assetKind: 2, weightBps: 3000 },
        { assetKind: 3, weightBps: 1000 },
      ],
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
      metadataUri: "https://cdn.example/hlx.json",
      backingBasket: [
        { assetKind: 0, weightBps: 6000 },
        { assetKind: 1, weightBps: 0 },
        { assetKind: 2, weightBps: 3000 },
        { assetKind: 3, weightBps: 1000 },
      ],
    });
  });

  it("defaults metadataUri to empty for accounts created before the field existed", () => {
    const legacy = Buffer.concat([
      (() => {
        const buf = Buffer.alloc(544);
        LAUNCH_DISC.copy(buf, 0);
        pubkey(2).bytes.copy(buf, 48);
        buf.writeUInt8(2, 400);
        buf.writeBigInt64LE(1_700_000_000n, 405);
        buf.writeBigUInt64LE(50_000_000n, 447);
        return buf;
      })(),
      encodeString("Legacy"),
      encodeString("LGC"),
      Buffer.from([1]),
    ]);
    expect(decodeLaunchAccount(legacy)?.metadataUri).toBe("");
    expect(decodeLaunchAccount(legacy)?.backingBasket).toBeNull();
  });

  it("ignores zero padding where an older account has no basket field", () => {
    const legacy = Buffer.concat([
      (() => {
        const buf = Buffer.alloc(544);
        LAUNCH_DISC.copy(buf, 0);
        pubkey(2).bytes.copy(buf, 48);
        buf.writeUInt8(2, 400);
        return buf;
      })(),
      encodeString("Legacy"),
      encodeString("LGC"),
      Buffer.from([1]),
      Buffer.alloc(12),
    ]);
    expect(decodeLaunchAccount(legacy)?.backingBasket).toBeNull();
  });

  it("reads the basket from a create_launch instruction when the account did not store it", () => {
    const name = encodeString("New backing test");
    const symbol = encodeString("BCKNG");
    const uri = encodeString("https://media.example/bckng.json");
    const fixed = Buffer.alloc(1 + 1 + 8 + 8 + 8 + 2 * 7 + 8 + 8 + 2 + 8 * 6 + 2 * 7 + 1 + 1);
    const basket = Buffer.from("004c0401280a02a00f03fc08", "hex");
    const data = Buffer.concat([CREATE_LAUNCH_DISC, Buffer.alloc(8), name, symbol, uri, fixed, basket]);
    expect(basketFromCreateInstruction(data)).toEqual([
      { assetKind: 0, weightBps: 1100 },
      { assetKind: 1, weightBps: 2600 },
      { assetKind: 2, weightBps: 4000 },
      { assetKind: 3, weightBps: 2300 },
    ]);
    expect(basketFromCreateInstruction(Buffer.alloc(32))).toBeNull();
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

  it("resolves logoUrl and socials from the Launch metadata URI", async () => {
    const mint = pubkey(2);
    const data = encodeLaunch({
      mint: mint.bytes,
      creator: pubkey(1).bytes,
      eol: pubkey(3).bytes,
      backing: pubkey(9).bytes,
      status: 2,
      timestamp: 1_700_000_000n,
      targetRaise: 50_000_000n,
      name: "Helix",
      symbol: "HLX",
      metadataUri: "https://cdn.example/hlx.json",
    });

    const hydrator = createAccountHydrator({
      getAccounts: async () => [data],
      backingMints: { [pubkey(9).base58]: "cSOL" },
      fetchJson: async (url) => {
        expect(url).toBe("https://cdn.example/hlx.json");
        return {
          image: "https://cdn.example/hlx.png",
          description: "The Helix launch.",
          external_url: "https://helix.example",
          extensions: { twitter: "https://x.com/helix" },
        };
      },
    });

    const snapshot = await hydrator.hydrate({
      mint: mint.base58,
      creator: pubkey(1).base58,
      eol: pubkey(3).base58,
      launchId: 1n,
      accountKeys: ["launch"],
      blockTime: 1_700_000_111,
    });

    expect(snapshot).toMatchObject({
      metadataUri: "https://cdn.example/hlx.json",
      logoUrl: "https://cdn.example/hlx.png",
      description: "The Helix launch.",
      socials: {
        website: "https://helix.example",
        twitter: "https://x.com/helix",
        telegram: null,
        discord: null,
      },
    });
  });
});
