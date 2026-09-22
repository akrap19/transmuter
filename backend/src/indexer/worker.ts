import type { Indexer, LogSource } from "./types.ts";
import { subscribeProgramLogs, type WsFactory } from "./ws.ts";

export async function startIndexerWorker(options: {
  indexer: Indexer;
  source?: LogSource;
  wsUrl?: string | null;
  programIds: string[];
  resolveTx?: Parameters<typeof subscribeProgramLogs>[0]["resolveTx"];
  websocket?: WsFactory;
}): Promise<{ stop: () => void }> {
  if (options.source) {
    try {
      await options.indexer.catchUp(options.source);
    } catch (error) {
      console.error("indexer catch-up failed", error instanceof Error ? error.message : "unknown error");
    }
  }

  if (!options.wsUrl) {
    return { stop() {} };
  }

  try {
    return await subscribeProgramLogs({
      wsUrl: options.wsUrl,
      programIds: options.programIds,
      indexer: options.indexer,
      resolveTx: options.resolveTx,
      websocket: options.websocket,
    });
  } catch (error) {
    console.error("indexer websocket failed", error instanceof Error ? error.message : "unknown error");
    return { stop() {} };
  }
}
