import { describe, expect, it } from "vitest";
import { encodeBase58 } from "./base58.ts";
import { CREATE_LAUNCH_DISC, LAUNCH_DISC } from "./hydrate.ts";
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

function encodeLaunch(
  mintSeed: number,
  status: number,
  name: string,
  symbol: string,
  metadataUri = "",
): Buffer {
  const buf = Buffer.alloc(544);
  LAUNCH_DISC.copy(buf, 0);
  pubkey(1).copy(buf, 16);
  pubkey(mintSeed).copy(buf, 48);
  pubkey(3).copy(buf, 80);
  pubkey(9).copy(buf, 272);
  buf.writeUInt8(status, 400);
  buf.writeBigInt64LE(1_700_000_000n, 405);
  buf.writeBigUInt64LE(900_000_000_000n, 447);
  return Buffer.concat([
    buf,
    encodeString(name),
    encodeString(symbol),
    encodeString(metadataUri),
    Buffer.from([1]),
  ]);
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

  it("resolves logoUrl from each launch's metadata URI", async () => {
    const withLogo = encodeLaunch(2, 2, "Logo", "LOG", "https://cdn.example/log.json");
    const fetchImpl: RpcFetch = async () =>
      new Response(
        JSON.stringify({
          result: [{ account: { data: [withLogo.toString("base64"), "base64"] } }],
        }),
      );

    const writes = createMemoryWrites();
    await syncFactoryLaunches({
      fetch: fetchImpl,
      rpcUrl: "http://rpc.test",
      programId: "factory",
      writes,
      backingMints: { [encodeBase58(pubkey(9))]: "cSOL" },
      fetchJson: async (url) => {
        expect(url).toBe("https://cdn.example/log.json");
        return { image: "https://cdn.example/log.png", description: "Logo coin" };
      },
    });

    const [coin] = await writes.list();
    expect(coin.metadataUri).toBe("https://cdn.example/log.json");
    expect(coin.logoUrl).toBe("https://cdn.example/log.png");
  });

  it("recovers a basket from the create transaction when the account only has zero padding", async () => {
    const account = encodeLaunch(2, 2, "New backing test", "BCKNG");
    const ix = Buffer.concat([
      CREATE_LAUNCH_DISC,
      Buffer.alloc(8),
      encodeString("New backing test"),
      encodeString("BCKNG"),
      encodeString(""),
      Buffer.alloc(1 + 1 + 8 + 8 + 8 + 2 * 7 + 8 + 8 + 2 + 8 * 6 + 2 * 7 + 1 + 1),
      Buffer.from("004c0401280a02a00f03fc08", "hex"),
    ]);
    const fetchImpl: RpcFetch = async (_url, init) => {
      const body = JSON.parse(init.body) as { method: string };
      if (body.method === "getProgramAccounts") {
        return new Response(
          JSON.stringify({
            result: [{ pubkey: "Launch111", account: { data: [account.toString("base64"), "base64"] } }],
          }),
        );
      }
      if (body.method === "getSignaturesForAddress") {
        return new Response(JSON.stringify({ result: [{ signature: "newersig" }, { signature: "createsig" }] }));
      }
      return new Response(
        JSON.stringify({
          result: { transaction: { message: { instructions: [{ data: encodeBase58(ix) }] } } },
        }),
      );
    };

    const writes = createMemoryWrites();
    const basketCache = new Map();
    await syncFactoryLaunches({
      fetch: fetchImpl,
      rpcUrl: "http://rpc.test",
      programId: "factory",
      writes,
      basketCache,
    });
    await syncFactoryLaunches({
      fetch: async (_url, init) => {
        const body = JSON.parse(init.body) as { method: string };
        expect(body.method).toBe("getProgramAccounts");
        return new Response(
          JSON.stringify({
            result: [{ pubkey: "Launch111", account: { data: [account.toString("base64"), "base64"] } }],
          }),
        );
      },
      rpcUrl: "http://rpc.test",
      programId: "factory",
      writes,
      basketCache,
    });

    const [coin] = await writes.list();
    expect(coin.backingBasket).toEqual([
      { assetKind: 0, weightBps: 1100 },
      { assetKind: 1, weightBps: 2600 },
      { assetKind: 2, weightBps: 4000 },
      { assetKind: 3, weightBps: 2300 },
    ]);
  });

  it("keeps syncing when the create-transaction lookup is rate limited", async () => {
    const account = encodeLaunch(2, 2, "New backing test", "BCKNG");
    const fetchImpl: RpcFetch = async (_url, init) => {
      const body = JSON.parse(init.body) as { method: string };
      if (body.method === "getProgramAccounts") {
        return new Response(
          JSON.stringify({
            result: [{ pubkey: "Launch111", account: { data: [account.toString("base64"), "base64"] } }],
          }),
        );
      }
      return new Response("rate limited", { status: 429 });
    };

    const writes = createMemoryWrites();
    const applied = await syncFactoryLaunches({
      fetch: fetchImpl,
      rpcUrl: "http://rpc.test",
      programId: "factory",
      writes,
    });
    expect(applied).toBe(1);
    expect((await writes.list())[0].backingBasket).toBeNull();
  });
});
