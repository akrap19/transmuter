import { timingSafeEqual } from "node:crypto";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { CacheStore } from "./cache/types.ts";
import { parseCoinQuery } from "./catalog/parse-query.ts";
import { queryCoins } from "./catalog/query.ts";
import type { CatalogStore } from "./catalog/store.ts";
import { createdCoins, heldCoins, parseHeldAccounts } from "./catalog/wallets.ts";
import { parseHeliusPayload } from "./indexer/helius.ts";
import type { Indexer } from "./indexer/types.ts";
import { ALLOWED_MEDIA_TYPES, MAX_MEDIA_BYTES, type MediaStore } from "./media/types.ts";

export type AppDeps = {
  catalog: CatalogStore;
  cache: CacheStore;
  cacheTtlSeconds: number;
  publicUrl: string;
  frontendOrigin?: string;
  media?: MediaStore;
  indexer?: Indexer;
  webhookSecret?: string;
};

function webhookAuthorized(header: string | undefined, secret: string): boolean {
  if (!secret || !header) return false;
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type AppInstance = FastifyInstance;

async function cachedJson<T>(
  cache: CacheStore,
  ttlSeconds: number,
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  if (ttlSeconds > 0) {
    try {
      const hit = await cache.get(key);
      if (hit != null) return JSON.parse(hit) as T;
    } catch {
      // miss on cache errors; the read model still serves
    }
  }

  const value = await load();
  if (ttlSeconds > 0) {
    try {
      await cache.set(key, JSON.stringify(value), ttlSeconds);
    } catch {
      // ignore cache write failures
    }
  }
  return value;
}

export async function buildApp(deps: AppDeps): Promise<AppInstance> {
  const app = Fastify({ logger: false });

  if (deps.frontendOrigin) {
    await app.register(cors, { origin: deps.frontendOrigin });
  }

  app.get("/health", async () => ({ ok: true }));

  app.setErrorHandler((error, _request, reply) => {
    const code = (error as { code?: string; statusCode?: number }).code;
    const status = (error as { statusCode?: number }).statusCode;
    if (code === "FST_REQ_FILE_TOO_LARGE" || status === 413) {
      return reply.code(413).send({ error: "too large" });
    }
    throw error;
  });

  if (deps.media) {
    const media = deps.media;
    await app.register(multipart, {
      limits: { fileSize: MAX_MEDIA_BYTES },
      throwFileSizeLimit: true,
    });

    app.post("/media", async (request, reply) => {
      const file = await request.file();
      if (!file) {
        return reply.code(400).send({ error: "file is required" });
      }
      const contentType = file.mimetype || "application/octet-stream";
      if (!ALLOWED_MEDIA_TYPES.has(contentType)) {
        return reply.code(415).send({ error: "unsupported media type" });
      }
      const bytes = await file.toBuffer();
      if (bytes.byteLength > MAX_MEDIA_BYTES) {
        return reply.code(413).send({ error: "too large" });
      }
      return media.save({
        bytes: new Uint8Array(bytes),
        contentType,
        filename: file.filename || "upload",
      });
    });

    app.get<{ Params: { id: string } }>("/media/:id", async (request, reply) => {
      const stored = media.read(request.params.id);
      if (!stored) {
        return reply.code(404).send({ error: "not found" });
      }
      return reply
        .header("Content-Type", stored.contentType)
        .header("Cache-Control", "public, max-age=31536000, immutable")
        .send(Buffer.from(stored.bytes));
    });
  }

  app.get("/coins", async (request) => {
    const url = new URL(request.url, deps.publicUrl);
    const query = parseCoinQuery(url.searchParams);
    return cachedJson(deps.cache, deps.cacheTtlSeconds, `coins:list:${url.searchParams.toString()}`, async () => {
      const catalog = await deps.catalog.list();
      return queryCoins(catalog, query);
    });
  });

  app.get<{ Params: { mint: string } }>("/coins/:mint/chart", async (request, reply) => {
    const { mint } = request.params;
    const found = await deps.catalog.get(mint);
    if (!found) {
      return reply.code(404).send({ error: "not found" });
    }

    const points = await cachedJson(deps.cache, deps.cacheTtlSeconds, `coins:chart:${mint}`, () =>
      deps.catalog.chart(mint),
    );
    return { points };
  });

  app.get<{ Params: { mint: string } }>("/coins/:mint", async (request, reply) => {
    const { mint } = request.params;
    const coin = await cachedJson(deps.cache, deps.cacheTtlSeconds, `coins:detail:${mint}`, async () => {
      const found = await deps.catalog.get(mint);
      if (!found) return null;
      const chart = await deps.catalog.chart(mint);
      return { ...found, chart };
    });

    if (!coin) {
      return reply.code(404).send({ error: "not found" });
    }
    return coin;
  });

  app.get<{ Params: { wallet: string } }>("/users/:wallet/created", async (request) => {
    const { wallet } = request.params;
    const catalog = await deps.catalog.list();
    return queryCoins(createdCoins(catalog, wallet), {});
  });

  app.get<{ Params: { wallet: string } }>("/users/:wallet/held", async (request) => {
    const url = new URL(request.url, deps.publicUrl);
    const catalog = await deps.catalog.list();
    return { items: heldCoins(catalog, parseHeldAccounts(url.searchParams)) };
  });

  if (deps.indexer && deps.webhookSecret) {
    const indexer = deps.indexer;
    const secret = deps.webhookSecret;
    app.post("/webhooks/helius", async (request, reply) => {
      if (!webhookAuthorized(request.headers.authorization, secret)) {
        return reply.code(401).send({ error: "unauthorized" });
      }
      const result = await indexer.ingest(parseHeliusPayload(request.body));
      return { ok: true, applied: result.applied, lastSlot: result.lastSlot.toString() };
    });
  }

  return app;
}
