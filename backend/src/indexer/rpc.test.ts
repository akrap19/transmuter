import { describe, expect, it } from "vitest";
import { createRpcLogSource } from "./rpc.ts";

type RpcCall = { method: string; params: unknown };

function jsonRpcOk(id: number, result: unknown) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    headers: { "content-type": "application/json" },
  });
}

describe("createRpcLogSource", () => {
  it("replays program signatures at or after lastSlot and maps them into chain txs", async () => {
    const calls: RpcCall[] = [];
    const source = createRpcLogSource({
      rpcUrl: "https://rpc.example",
      programIds: ["Factory11111111111111111111111111111111111"],
      fetch: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { id: number; method: string; params: unknown };
        calls.push({ method: body.method, params: body.params });
        if (body.method === "getSlot") return jsonRpcOk(body.id, 90);
        if (body.method === "getSignaturesForAddress") {
          return jsonRpcOk(body.id, [
            { signature: "sig-new", slot: 80, err: null },
            { signature: "sig-old", slot: 10, err: null },
          ]);
        }
        if (body.method === "getTransaction") {
          return jsonRpcOk(body.id, {
            slot: 80,
            blockTime: 1_700_000_080,
            meta: { err: null, logMessages: ["Program data: abc"] },
            transaction: { message: { accountKeys: ["Mint1111111111111111111111111111111111111"] } },
          });
        }
        return jsonRpcOk(body.id, null);
      },
    });

    expect(await source.currentSlot()).toBe(90n);
    const txs = await source.transactionsSince(40n);

    expect(txs).toEqual([
      {
        slot: 80n,
        signature: "sig-new",
        blockTime: 1_700_000_080,
        logs: ["Program data: abc"],
        accountKeys: ["Mint1111111111111111111111111111111111111"],
        tokenTransfers: [],
        err: undefined,
      },
    ]);
    expect(calls.some((call) => call.method === "getTransaction")).toBe(true);
    expect(calls.find((call) => call.method === "getSignaturesForAddress")?.params).toEqual([
      "Factory11111111111111111111111111111111111",
      { limit: 1000 },
    ]);
  });
});
