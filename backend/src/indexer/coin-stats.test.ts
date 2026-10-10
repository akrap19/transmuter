import { describe, expect, it } from "vitest";
import { encodeBase58 } from "./base58.ts";
import {
  backingRatioBps,
  countDeposits,
  decodeConfigBalances,
  depositConfig,
  isPubkey,
  saleProgressBps,
  saleQuote,
  syncCoinStats,
} from "./coin-stats.ts";
import { createMemoryWrites } from "./memory.ts";
import type { RpcFetch } from "./rpc.ts";

const configBytes = Buffer.alloc(32, 4);
const saleUsdcBytes = Buffer.alloc(32, 5);
const treasuryBytes = Buffer.alloc(32, 6);
const ctokenBytes = Buffer.alloc(32, 7);
const CONFIG = encodeBase58(configBytes);
const SALE_USDC = encodeBase58(saleUsdcBytes);
const TREASURY = encodeBase58(treasuryBytes);
const CTOKEN = encodeBase58(ctokenBytes);
const BUYER = Buffer.alloc(32, 8);

function configAccount(): Buffer {
  const buf = Buffer.alloc(847);
  saleUsdcBytes.copy(buf, 8 + 6 * 32);
  treasuryBytes.copy(buf, 8 + 10 * 32);
  ctokenBytes.copy(buf, 8 + 11 * 32);
  buf.writeUInt8(9, 520);
  buf.writeBigUInt64LE(57_142n, 522);
  buf.writeBigUInt64LE(100_000_000_000n, 530);
  buf.writeBigUInt64LE(70_000_000_000n, 538);
  buf.writeBigUInt64LE(69_999_999_999n, 562);
  buf.writeBigUInt64LE(3_981_636n, 658);
  buf.writeBigInt64LE(0n, 818);
  buf.writeInt32LE(0, 834);
  return buf;
}

function tokenAccount(amount: bigint): Buffer {
  const buf = Buffer.alloc(72);
  buf.writeBigUInt64LE(amount, 64);
  return buf;
}

function depositAccount(): Buffer {
  const buf = Buffer.alloc(82);
  configBytes.copy(buf, 8);
  BUYER.copy(buf, 40);
  buf.writeBigUInt64LE(3_999_940n, 72);
  return buf;
}

describe("coin stats", () => {
  it("keeps a USDC backing ratio when leftover SOL has no oracle price", () => {
    expect(
      backingRatioBps({
        unconvertedUsdcAtoms: 2_854_360n,
        ctokenAtoms: 0n,
        solResidueLamports: 3_981_636n,
        oraclePrice: 0n,
        oracleExpo: 0,
        totalSupplyAtoms: 100_000_000_000n,
        salePriceAtoms: 57_142n,
        decimals: 9,
      }),
    ).toBe(4995);
  });

  it("prices the coin from the sale and treats an unsellable leftover as sold out", () => {
    expect(saleProgressBps(69_999_999_999n, 70_000_000_000n, 57_142n, 9)).toBe(10_000);
    expect(saleProgressBps(35_000_000_000n, 70_000_000_000n, 57_142n, 9)).toBe(5_000);
    expect(saleQuote({ salePrice: 57_142n, supplyAtoms: 100_000_000_000n, decimals: 9 })).toEqual({
      priceUsd: 0.057142,
      marketCapUsd: 5.7142,
    });
  });

  it("rejects an address that does not decode to 32 bytes", () => {
    expect(isPubkey(CONFIG)).toBe(true);
    expect(isPubkey("111111111111111111111111111111111")).toBe(false);
  });

  it("leaves the ratio unknown when held cToken cannot be priced", () => {
    expect(
      backingRatioBps({
        unconvertedUsdcAtoms: 0n,
        ctokenAtoms: 2_000_000_000n,
        solResidueLamports: 0n,
        oraclePrice: 0n,
        oracleExpo: -8,
        totalSupplyAtoms: 100_000_000_000_000n,
        salePriceAtoms: 70_000n,
        decimals: 9,
      }),
    ).toBeNull();
  });

  it("writes the treasury ratio and the buyer count onto the launch", async () => {
    const decoded = decodeConfigBalances(configAccount());
    expect(decoded?.treasuryUsdc).toBe(TREASURY);
    expect(decoded?.salePrice).toBe(57_142n);
    expect(countDeposits([depositAccount()])).toBe(1);
    expect(depositConfig(depositAccount())).toBe(CONFIG);

    const accounts = new Map<string, Buffer>([
      [CONFIG, configAccount()],
      [SALE_USDC, tokenAccount(0n)],
      [TREASURY, tokenAccount(2_854_360n)],
      [CTOKEN, tokenAccount(0n)],
    ]);
    const fetchImpl: RpcFetch = async (_url, init) => {
      const body = JSON.parse(init.body) as { method: string; params: unknown[] };
      if (body.method === "getMultipleAccounts") {
        const keys = body.params[0] as string[];
        return json({
          value: keys.map((key) => ({ data: [accounts.get(key)?.toString("base64") ?? "", "base64"] })),
        });
      }
      return json([{ account: { data: [depositAccount().toString("base64"), "base64"] } }]);
    };
    const writes = createMemoryWrites([
      {
        mint: "Mint",
        name: "transakcija",
        symbol: "TRSNKC",
        creator: "creator",
        backing: "cSOL",
        backingBasket: null,
        status: "active",
        metadataUri: null,
        logoUrl: null,
        description: "",
        socials: { website: null, twitter: null, telegram: null, discord: null },
        launchedAt: 1,
        eolConfig: CONFIG,
        targetRaiseUsdc: null,
        priceUsd: null,
        marketCapUsd: null,
        backingRatioBps: null,
        saleProgressBps: null,
        holderCount: 0,
      },
    ]);

    const applied = await syncCoinStats({
      fetch: fetchImpl,
      rpcUrl: "http://rpc",
      eolProgramId: "eol",
      launches: [{ mint: "Mint", eolConfig: CONFIG, priceUsd: null, marketCapUsd: null }],
      writes,
      now: 1_700_000_000_000,
    });

    expect(applied).toBe(1);
    expect(await writes.getLaunch("Mint")).toMatchObject({
      backingRatioBps: 4995,
      holderCount: 1,
      saleProgressBps: 10_000,
      priceUsd: 0.057142,
      marketCapUsd: 5.7142,
    });
  });
});

function json(result: unknown): Response {
  return new Response(JSON.stringify({ result }), { status: 200 });
}
