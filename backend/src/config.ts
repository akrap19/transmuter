import { DEFAULT_EOL_PROGRAM_ID, DEFAULT_FACTORY_PROGRAM_ID } from "./indexer/programs.ts";

export type AppConfig = {
  host: string;
  port: number;
  publicUrl: string;
  frontendOrigin: string | string[];
  databaseUrl: string | null;
  redisUrl: string | null;
  mediaDir: string;
  r2: R2Config | null;
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

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
};

function optional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function frontendOrigins(value: string | null): string | string[] {
  const origins = (value ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0) return "http://localhost:3000";
  return origins.length === 1 ? origins[0] : origins;
}

function r2Config(env: Record<string, string | undefined>): R2Config | null {
  const accountId = optional(env.R2_ACCOUNT_ID);
  const accessKeyId = optional(env.R2_ACCESS_KEY_ID);
  const secretAccessKey = optional(env.R2_SECRET_ACCESS_KEY);
  const bucket = optional(env.R2_BUCKET);
  const publicUrl = optional(env.R2_PUBLIC_URL);
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl: publicUrl.replace(/\/$/, "") };
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
    frontendOrigin: frontendOrigins(optional(env.FRONTEND_ORIGIN)),
    databaseUrl: optional(env.DATABASE_URL),
    redisUrl: optional(env.REDIS_URL),
    mediaDir: optional(env.MEDIA_DIR) ?? ".data/media",
    r2: r2Config(env),
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
