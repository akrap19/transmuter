import { parseHeliusPayload } from "./helius.ts";
import type { ChainTx, LogSource } from "./types.ts";

export type RpcFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<Response>;

export type RpcLogSourceOptions = {
  rpcUrl: string;
  programIds: string[];
  fetch?: RpcFetch;
};

type RpcResponse = { result?: unknown; error?: { message?: string } };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rateLimited(status: number, message: string): boolean {
  return status === 429 || status >= 500 || /429|too many|rate limit/i.test(message);
}

export async function rpcCall(fetchImpl: RpcFetch, rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  let wait = 500;
  let last = method;
  for (let attempt = 0; attempt < 6; attempt++) {
    let res: Response;
    try {
      res = await fetchImpl(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(12_000),
      });
    } catch (error) {
      last = error instanceof Error ? error.message : method;
      console.error(`rpc ${method} retry: ${last}`);
      await sleep(wait);
      wait = Math.min(wait * 2, 4_000);
      continue;
    }
    if (rateLimited(res.status, "")) {
      await res.arrayBuffer().catch(() => undefined);
      last = `${method} HTTP ${res.status}`;
      if (attempt >= 1) break;
      await sleep(wait);
      wait = Math.min(wait * 2, 4_000);
      continue;
    }
    const body = (await res.json()) as RpcResponse;
    if (body.error) {
      const message = body.error.message ?? method;
      if (rateLimited(0, message) && attempt < 1) {
        last = message;
        await sleep(wait);
        wait = Math.min(wait * 2, 4_000);
        continue;
      }
      throw new Error(message);
    }
    return body.result;
  }
  throw new Error(last);
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
        console.info(`indexer scanning ${programId}`);
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

      console.info(`indexer fetching ${pending.length} transactions`);
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
