import type { Indexer, LogSource } from "./types.ts";
import { subscribeProgramLogs, type WsFactory } from "./ws.ts";

export async function startIndexerWorker(options: {
  indexer: Indexer;
  source?: LogSource;
  wsUrl?: string | null;
  programIds: string[];
  resolveTx?: Parameters<typeof subscribeProgramLogs>[0]["resolveTx"];
  websocket?: WsFactory;
  syncLaunches?: () => Promise<number>;
  syncIntervalMs?: number;
}): Promise<{ stop: () => void }> {
  const stops: Array<() => void> = [];

  if (options.syncLaunches) {
    const syncLaunches = options.syncLaunches;
    let seen = -1;
    const run = async () => {
      const count = await syncLaunches();
      if (count !== seen) {
        console.info(`indexer synced ${count} factory launches`);
        seen = count;
      }
    };
    try {
      await run();
    } catch (error) {
      console.error("indexer launch sync failed", error instanceof Error ? error.message : "unknown error");
    }
    const interval = options.syncIntervalMs ?? 20_000;
    if (interval > 0) {
      const timer = setInterval(() => {
        void run().catch((error: unknown) => {
          console.error("indexer launch sync failed", error instanceof Error ? error.message : "unknown error");
        });
      }, interval);
      stops.push(() => clearInterval(timer));
    }
  }

  if (options.source) {
    try {
      const result = await options.indexer.catchUp(options.source);
      console.info(`indexer catch-up applied ${result.applied} through slot ${result.lastSlot}`);
    } catch (error) {
      console.error("indexer catch-up failed", error instanceof Error ? error.message : "unknown error");
    }
  }

  if (!options.wsUrl) {
    return {
      stop() {
        for (const stop of stops) stop();
      },
    };
  }

  try {
    const subscription = await subscribeProgramLogs({
      wsUrl: options.wsUrl,
      programIds: options.programIds,
      indexer: options.indexer,
      resolveTx: options.resolveTx,
      websocket: options.websocket,
    });
    stops.push(subscription.stop);
    return {
      stop() {
        for (const stop of stops) stop();
      },
    };
  } catch (error) {
    console.error("indexer websocket failed", error instanceof Error ? error.message : "unknown error");
    return {
      stop() {
        for (const stop of stops) stop();
      },
    };
  }
}
