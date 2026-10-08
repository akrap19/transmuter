import { describe, expect, it } from "vitest";
import { resolveConfig } from "./config.ts";
import { DEFAULT_EOL_PROGRAM_ID, DEFAULT_FACTORY_PROGRAM_ID } from "./indexer/programs.ts";

describe("resolveConfig", () => {
  it("reads connection strings from env and does not invent secrets", () => {
    const config = resolveConfig({
      PORT: "4000",
      HOST: "127.0.0.1",
      PUBLIC_URL: "http://localhost:4000",
      FRONTEND_ORIGIN: "http://localhost:3000",
      DATABASE_URL: "mysql://app:secret@localhost:3306/transmuter",
      REDIS_URL: "redis://localhost:6379",
      MEDIA_DIR: "/tmp/media",
      CACHE_TTL_SECONDS: "30",
      SOLANA_RPC_URL: "https://devnet.helius-rpc.com/?api-key=secret",
      SOLANA_WS_URL: "wss://devnet.helius-rpc.com/?api-key=secret",
      HELIUS_WEBHOOK_SECRET: "whsec",
      FACTORY_PROGRAM_ID: "Factory11111111111111111111111111111111111",
      EOL_PROGRAM_ID: "Eol11111111111111111111111111111111111111",
      CSOL_MINT: "Csol1111111111111111111111111111111111111",
      INDEXER_FROM_SLOT: "99",
    });

    expect(config.databaseUrl).toBe("mysql://app:secret@localhost:3306/transmuter");
    expect(config.redisUrl).toBe("redis://localhost:6379");
    expect(config.heliusWebhookSecret).toBe("whsec");
    expect(config.solanaRpcUrl).toContain("devnet.helius-rpc.com");
    expect(config.solanaWsUrl).toContain("wss://devnet.helius-rpc.com");
    expect(config.factoryProgramId).toBe("Factory11111111111111111111111111111111111");
    expect(config.eolProgramId).toBe("Eol11111111111111111111111111111111111111");
    expect(config.csolMint).toBe("Csol1111111111111111111111111111111111111");
    expect(config.indexerFromSlot).toBe(99n);
    expect(config.port).toBe(4000);
    expect(config.frontendOrigin).toBe("http://localhost:3000");
  });

  it("allows every comma-separated frontend origin", () => {
    const config = resolveConfig({
      FRONTEND_ORIGIN: "http://localhost:3003, http://localhost:3006",
    });

    expect(config.frontendOrigin).toEqual(["http://localhost:3003", "http://localhost:3006"]);
  });

  it("defaults to local API settings when optional env is omitted", () => {
    const config = resolveConfig({});

    expect(config.port).toBe(3001);
    expect(config.publicUrl).toBe("http://localhost:3001");
    expect(config.databaseUrl).toBeNull();
    expect(config.redisUrl).toBeNull();
    expect(config.heliusWebhookSecret).toBeNull();
    expect(config.solanaRpcUrl).toBeNull();
    expect(config.solanaWsUrl).toBeNull();
    expect(config.factoryProgramId).toBe(DEFAULT_FACTORY_PROGRAM_ID);
    expect(config.eolProgramId).toBe(DEFAULT_EOL_PROGRAM_ID);
    expect(config.cacheTtlSeconds).toBe(15);
    expect(config.indexerFromSlot).toBe(0n);
    expect(config.r2).toBeNull();
  });

  it("uses R2 only when the bucket credentials and public URL are all set", () => {
    const config = resolveConfig({
      R2_ACCOUNT_ID: "account",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET: "transmuter-media",
      R2_PUBLIC_URL: "https://media.transmuter.net/",
    });

    expect(config.r2).toEqual({
      accountId: "account",
      accessKeyId: "key",
      secretAccessKey: "secret",
      bucket: "transmuter-media",
      publicUrl: "https://media.transmuter.net",
    });
    expect(resolveConfig({ R2_BUCKET: "transmuter-media" }).r2).toBeNull();
  });
});
