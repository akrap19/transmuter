import type { ChainTx, Indexer } from "./types.ts";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function parseLogsNotification(message: unknown): ChainTx | null {
  const rec = asRecord(message);
  if (rec?.method !== "logsNotification") return null;
  const params = asRecord(rec.params);
  const result = asRecord(params?.result);
  const context = asRecord(result?.context);
  const value = asRecord(result?.value);
  if (!value) return null;
  const slotRaw = context?.slot;
  const slot = typeof slotRaw === "number" ? BigInt(slotRaw) : typeof slotRaw === "bigint" ? slotRaw : null;
  const signature = typeof value.signature === "string" ? value.signature : null;
  if (slot == null || !signature) return null;
  const logs = Array.isArray(value.logs) ? value.logs.filter((item): item is string => typeof item === "string") : [];
  return {
    slot,
    signature,
    blockTime: null,
    logs,
    accountKeys: [],
    tokenTransfers: [],
    err: value.err == null ? undefined : value.err,
  };
}

export type WsLike = {
  send: (data: string) => void;
  close: () => void;
  addEventListener: (type: "message" | "open" | "close", listener: (event: { data?: unknown }) => void) => void;
};

export type WsFactory = (url: string) => WsLike;

export async function subscribeProgramLogs(options: {
  wsUrl: string;
  programIds: string[];
  indexer: Indexer;
  resolveTx?: (stub: ChainTx) => Promise<ChainTx>;
  websocket?: WsFactory;
}): Promise<{ stop: () => void }> {
  const open = options.websocket ?? ((url) => new WebSocket(url) as unknown as WsLike);
  const socket = open(options.wsUrl);

  const onMessage = async (event: { data?: unknown }) => {
    let parsed: unknown = event.data;
    if (typeof event.data === "string") {
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }
    }
    const stub = parseLogsNotification(parsed);
    if (!stub) return;
    const tx = options.resolveTx ? await options.resolveTx(stub) : stub;
    await options.indexer.ingest([tx]);
  };

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("websocket open timed out")), 5_000);
    socket.addEventListener("open", () => {
      clearTimeout(timer);
      for (const programId of options.programIds) {
        socket.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "logsSubscribe",
            params: [{ mentions: [programId] }, { commitment: "confirmed" }],
          }),
        );
      }
      resolve();
    });
    socket.addEventListener("message", (event) => {
      void onMessage(event);
    });
  });

  return {
    stop() {
      socket.close();
    },
  };
}
