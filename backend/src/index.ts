import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { buildApp } from "./app.ts";
import { createMemoryCache } from "./cache/memory.ts";
import { createRedisCache } from "./cache/redis.ts";
import { createPrismaCatalog } from "./catalog/prisma.ts";
import { resolveConfig } from "./config.ts";
import { createAccountHydrator } from "./indexer/hydrate.ts";
import { createIndexer } from "./indexer/ingest.ts";
import { createMemoryCursor, createMemoryWrites } from "./indexer/memory.ts";
import { createPrismaCursor, createPrismaWrites } from "./indexer/prisma.ts";
import { createRpcLogSource, fetchChainTx, getMultipleAccounts, type RpcFetch } from "./indexer/rpc.ts";
import { startIndexerWorker } from "./indexer/worker.ts";
import { createFileMediaStore } from "./media/files.ts";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const config = resolveConfig();

const prisma = config.databaseUrl ? new PrismaClient({ datasourceUrl: config.databaseUrl }) : null;
const redis = config.redisUrl
  ? new Redis(config.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 })
  : null;

if (redis) {
  try {
    await redis.connect();
  } catch {
    console.error("redis unavailable, using in-memory cache");
  }
}

const cache =
  redis?.status === "ready"
    ? createRedisCache({
        get: (key) => redis.get(key),
        set: (key, value, mode, ttl) => redis.set(key, value, mode, ttl),
      })
    : createMemoryCache();

const memoryIndex = createMemoryWrites();
const writes = prisma ? createPrismaWrites(prisma) : memoryIndex;
const catalog = prisma ? createPrismaCatalog(prisma) : memoryIndex;
const cursor = prisma ? createPrismaCursor(prisma) : createMemoryCursor();

if (config.indexerFromSlot > 0n && (await cursor.lastSlot()) === 0n) {
  await cursor.advanceTo(config.indexerFromSlot);
}

const backingMints: Record<string, string> = {};
if (config.csolMint) backingMints[config.csolMint] = "cSOL";
if (config.cbtcMint) backingMints[config.cbtcMint] = "cBTC";

const rpcFetch: RpcFetch = (url, init) => fetch(url, init);
const hydrator = config.solanaRpcUrl
  ? createAccountHydrator({
      getAccounts: (keys) => getMultipleAccounts(rpcFetch, config.solanaRpcUrl as string, keys),
      backingMints,
    })
  : { hydrate: async () => null };

const indexer = createIndexer({ cursor, writes, hydrator });
const programIds = [config.factoryProgramId, config.eolProgramId];
const source = config.solanaRpcUrl
  ? createRpcLogSource({ rpcUrl: config.solanaRpcUrl, programIds, fetch: rpcFetch })
  : undefined;

const app = await buildApp({
  catalog,
  cache,
  cacheTtlSeconds: config.cacheTtlSeconds,
  publicUrl: config.publicUrl,
  frontendOrigin: config.frontendOrigin,
  media: createFileMediaStore({ origin: config.publicUrl, dir: config.mediaDir }),
  indexer,
  webhookSecret: config.heliusWebhookSecret ?? undefined,
});

let stopWorker = (): void => {};

async function shutdown() {
  stopWorker();
  await app.close();
  if (redis) await redis.quit();
  if (prisma) await prisma.$disconnect();
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});

await app.listen({ host: config.host, port: config.port });
console.info(`transmuter-api listening on ${config.publicUrl}`);

const worker = await startIndexerWorker({
  indexer,
  source,
  wsUrl: config.solanaWsUrl,
  programIds,
  resolveTx: config.solanaRpcUrl
    ? async (stub) => (await fetchChainTx(rpcFetch, config.solanaRpcUrl as string, stub.signature)) ?? stub
    : undefined,
});
stopWorker = worker.stop;
