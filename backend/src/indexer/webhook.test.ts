import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp, type AppInstance } from "../app.ts";
import { createMemoryCache } from "../cache/memory.ts";
import { encodeBase58 } from "./base58.ts";
import { createIndexer } from "./ingest.ts";
import { createMemoryCursor, createMemoryWrites } from "./memory.ts";
import type { LaunchHydration } from "./types.ts";

function eventDisc(name: string): Buffer {
  return createHash("sha256").update(`event:${name}`).digest().subarray(0, 8);
}

function pubkey(seed: number): { bytes: Buffer; base58: string } {
  const bytes = Buffer.alloc(32, 0);
  bytes[0] = seed;
  bytes[31] = seed;
  return { bytes, base58: encodeBase58(bytes) };
}

const creator = pubkey(1);
const mint = pubkey(2);
const eol = pubkey(3);

function tokenLaunchedLog(): string {
  const payload = Buffer.concat([
    Buffer.alloc(8),
    creator.bytes,
    mint.bytes,
    eol.bytes,
    pubkey(4).bytes,
    pubkey(5).bytes,
    pubkey(6).bytes,
  ]);
  payload.writeBigUInt64LE(1n, 0);
  return `Program data: ${Buffer.concat([eventDisc("TokenLaunched"), payload]).toString("base64")}`;
}

const helix: LaunchHydration = {
  name: "Helix",
  symbol: "HLX",
  creator: creator.base58,
  backing: "cSOL",
  status: "sale",
  metadataUri: null,
  logoUrl: null,
  description: "",
  socials: { website: null, twitter: null, telegram: null, discord: null },
  launchedAt: 1_700_000_000,
  eolConfig: eol.base58,
  targetRaiseUsdc: 1n,
};

const SECRET = "webhook-secret";

async function webhookApp() {
  const writes = createMemoryWrites();
  const indexer = createIndexer({
    cursor: createMemoryCursor(),
    writes,
    hydrator: {
      async hydrate(input) {
        return input.mint === mint.base58 ? helix : null;
      },
    },
  });
  const app = await buildApp({
    catalog: writes,
    cache: createMemoryCache(),
    cacheTtlSeconds: 0,
    publicUrl: "http://localhost:3001",
    indexer,
    webhookSecret: SECRET,
  });
  return { app, writes };
}

describe("POST /webhooks/helius", () => {
  let app: AppInstance;

  afterEach(async () => {
    await app?.close();
  });

  it("ingests a Helius payload into the coin catalog", async () => {
    const built = await webhookApp();
    app = built.app;

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/helius",
      headers: { authorization: SECRET, "content-type": "application/json" },
      payload: [
        {
          slot: 42,
          signature: "sig-launch",
          timestamp: 1_700_000_000,
          logs: [tokenLaunchedLog()],
          accountData: [{ account: mint.base58 }],
        },
      ],
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, applied: 1, lastSlot: "42" });

    const coins = await app.inject({ method: "GET", url: "/coins" });
    expect(coins.json().items).toEqual([
      expect.objectContaining({ mint: mint.base58, symbol: "HLX", status: "sale" }),
    ]);
  });

  it("rejects a webhook that does not present the configured secret", async () => {
    const built = await webhookApp();
    app = built.app;

    const missing = await app.inject({
      method: "POST",
      url: "/webhooks/helius",
      payload: [],
    });
    const wrong = await app.inject({
      method: "POST",
      url: "/webhooks/helius",
      headers: { authorization: "Bearer nope" },
      payload: [],
    });

    expect(missing.statusCode).toBe(401);
    expect(wrong.statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/coins" })).json()).toEqual({ items: [], total: 0 });
  });
});
