import { DEFAULT_EOL_PROGRAM_ID, DEFAULT_FACTORY_PROGRAM_ID } from "./indexer/programs.ts";

export type AppConfig = {
  host: string;
  port: number;
  publicUrl: string;
  frontendOrigin: string;
  databaseUrl: string | null;
  redisUrl: string | null;
  mediaDir: string;
  cacheTtlSeconds: number;
  solanaRpcUrl: string | null;
  solanaWsUrl: string | null;
  heliusWebhookSecret: string | null;
  factoryProgramId: string;
  eolProgramId: string;
  csolMint: string | null;
  cbtcMint: string | null;
  indexerFromSlot: bigint;
};

function optional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function resolveConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const port = Number.parseInt(env.PORT ?? "3001", 10);
  const publicUrl = optional(env.PUBLIC_URL) ?? `http://localhost:${Number.isFinite(port) ? port : 3001}`;
  const ttl = Number.parseInt(env.CACHE_TTL_SECONDS ?? "15", 10);
  const fromSlot = env.INDEXER_FROM_SLOT?.trim() ? BigInt(env.INDEXER_FROM_SLOT) : 0n;
  const solanaRpcUrl = optional(env.SOLANA_RPC_URL);

  return {
    host: optional(env.HOST) ?? "0.0.0.0",
    port: Number.isFinite(port) ? port : 3001,
    publicUrl,
    frontendOrigin: optional(env.FRONTEND_ORIGIN) ?? "http://localhost:3000",
    databaseUrl: optional(env.DATABASE_URL),
    redisUrl: optional(env.REDIS_URL),
    mediaDir: optional(env.MEDIA_DIR) ?? ".data/media",
    cacheTtlSeconds: Number.isFinite(ttl) && ttl >= 0 ? ttl : 15,
    solanaRpcUrl,
    solanaWsUrl: optional(env.SOLANA_WS_URL),
    heliusWebhookSecret: optional(env.HELIUS_WEBHOOK_SECRET),
    factoryProgramId: optional(env.FACTORY_PROGRAM_ID) ?? DEFAULT_FACTORY_PROGRAM_ID,
    eolProgramId: optional(env.EOL_PROGRAM_ID) ?? DEFAULT_EOL_PROGRAM_ID,
    csolMint: optional(env.CSOL_MINT),
    cbtcMint: optional(env.CBTC_MINT),
    indexerFromSlot: fromSlot < 0n ? 0n : fromSlot,
  };
}
