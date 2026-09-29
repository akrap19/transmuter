import { describe, expect, it } from "vitest";
import { encodeBase58 } from "./base58.ts";
import { LAUNCH_DISC } from "./hydrate.ts";
import { createMemoryWrites } from "./memory.ts";
import type { RpcFetch } from "./rpc.ts";
import { syncFactoryLaunches } from "./sync-launches.ts";

function pubkey(seed: number): Buffer {
  return Buffer.alloc(32, seed);
}

function encodeString(value: string): Buffer {
  const body = Buffer.from(value, "utf8");
  const head = Buffer.alloc(4);
  head.writeUInt32LE(body.length);
  return Buffer.concat([head, body]);
}

function encodeLaunch(mintSeed: number, status: number, name: string, symbol: string): Buffer {
  const buf = Buffer.alloc(544);
  LAUNCH_DISC.copy(buf, 0);
  pubkey(1).copy(buf, 16);
  pubkey(mintSeed).copy(buf, 48);
  pubkey(3).copy(buf, 80);
  pubkey(9).copy(buf, 272);
  buf.writeUInt8(status, 400);
  buf.writeBigInt64LE(1_700_000_000n, 405);
  buf.writeBigUInt64LE(900_000_000_000n, 447);
  return Buffer.concat([buf, encodeString(name), encodeString(symbol), Buffer.from([1]), Buffer.alloc(200)]);
}

describe("syncFactoryLaunches", () => {
  it("upserts every Factory launch account, including ones that never emitted TokenLaunched", async () => {
    const created = encodeLaunch(2, 0, "Test", "TST");
    const sale = encodeLaunch(4, 2, "Test", "TST");
    const fetchImpl: RpcFetch = async (_url, init) => {
      const body = JSON.parse(init.body) as { method: string; params: [string, { filters: Array<{ memcmp: { bytes: string } }> }] };
      expect(body.method).toBe("getProgramAccounts");
      expect(body.params[1].filters[0].memcmp.bytes).toBe(encodeBase58(LAUNCH_DISC));
      return new Response(
        JSON.stringify({
          result: [
            { account: { data: [created.toString("base64"), "base64"] } },
            { account: { data: [sale.toString("base64"), "base64"] } },
            { account: { data: [Buffer.from("nope").toString("base64"), "base64"] } },
          ],
        }),
      );
    };

    const writes = createMemoryWrites();
    const applied = await syncFactoryLaunches({
      fetch: fetchImpl,
      rpcUrl: "http://rpc.test",
      programId: "factory",
      writes,
      backingMints: { [encodeBase58(pubkey(9))]: "cSOL" },
    });

    const catalog = await writes.list();
    expect(applied).toBe(2);
    expect(catalog.map((item) => item.status).sort()).toEqual(["created", "sale"]);
    expect(catalog.every((item) => item.name === "Test" && item.symbol === "TST" && item.backing === "cSOL")).toBe(true);
  });
});
