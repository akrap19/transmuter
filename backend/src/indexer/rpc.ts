import { parseHeliusPayload } from "./helius.ts";
import type { ChainTx, LogSource } from "./types.ts";

export type RpcFetch = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<Response>;

export type RpcLogSourceOptions = {
  rpcUrl: string;
  programIds: string[];
  fetch?: RpcFetch;
};

type RpcResponse = { result?: unknown; error?: { message?: string } };

async function rpcCall(fetchImpl: RpcFetch, rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetchImpl(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = (await res.json()) as RpcResponse;
  if (body.error) throw new Error(body.error.message ?? method);
  return body.result;
}

function signatureSlot(value: unknown): { signature: string; slot: bigint } | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as { signature?: unknown; slot?: unknown };
  if (typeof rec.signature !== "string") return null;
  const slot = typeof rec.slot === "number" ? BigInt(rec.slot) : typeof rec.slot === "bigint" ? rec.slot : null;
  if (slot == null) return null;
  return { signature: rec.signature, slot };
}

export function createRpcLogSource(options: RpcLogSourceOptions): LogSource {
  const fetchImpl = options.fetch ?? fetch;
  const programIds = options.programIds.filter(Boolean);

  return {
    async currentSlot() {
      const slot = await rpcCall(fetchImpl, options.rpcUrl, "getSlot", []);
      return BigInt(slot as number);
    },
    async transactionsSince(lastSlot) {
      const seen = new Set<string>();
      const pending: { signature: string; slot: bigint }[] = [];

      for (const programId of programIds) {
        const rows = (await rpcCall(fetchImpl, options.rpcUrl, "getSignaturesForAddress", [
          programId,
          { limit: 1000 },
        ])) as unknown[];
        for (const row of rows ?? []) {
          const sig = signatureSlot(row);
          if (!sig || sig.slot < lastSlot || seen.has(sig.signature)) continue;
          seen.add(sig.signature);
          pending.push(sig);
        }
      }

      pending.sort((a, b) => (a.slot === b.slot ? a.signature.localeCompare(b.signature) : a.slot < b.slot ? -1 : 1));

      const txs: ChainTx[] = [];
      for (const item of pending) {
        const tx = await fetchChainTx(fetchImpl, options.rpcUrl, item.signature);
        if (tx) txs.push(tx);
      }
      return txs;
    },
  };
}

export async function fetchChainTx(
  fetchImpl: RpcFetch,
  rpcUrl: string,
  signature: string,
): Promise<ChainTx | null> {
  const raw = await rpcCall(fetchImpl, rpcUrl, "getTransaction", [
    signature,
    { encoding: "json", maxSupportedTransactionVersion: 0 },
  ]);
  if (!raw || typeof raw !== "object") return null;
  return parseHeliusPayload({ ...(raw as object), signature })[0] ?? null;
}

export async function getMultipleAccounts(
  fetchImpl: RpcFetch,
  rpcUrl: string,
  keys: string[],
): Promise<Array<Uint8Array | null>> {
  if (keys.length === 0) return [];
  const result = (await rpcCall(fetchImpl, rpcUrl, "getMultipleAccounts", [keys, { encoding: "base64" }])) as {
    value?: Array<{ data?: [string, string] } | null>;
  };
  return (result?.value ?? []).map((item) => {
    const data = item?.data?.[0];
    if (!data) return null;
    return Buffer.from(data, "base64");
  });
}
