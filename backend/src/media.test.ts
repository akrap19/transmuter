import { afterEach, describe, expect, it } from "vitest";
import { buildApp, type AppInstance } from "./app.ts";
import { createMemoryCache } from "./cache/memory.ts";
import { createMemoryCatalog } from "./catalog/memory.ts";
import { createMemoryMediaStore } from "./media/memory.ts";

const PNG = new Uint8Array([137, 80, 78, 71]);
const BOUNDARY = "VitestBoundary";

function form(file?: { bytes: Uint8Array; type: string; filename: string }) {
  if (!file) {
    return {
      headers: { "content-type": `multipart/form-data; boundary=${BOUNDARY}` },
      payload: Buffer.from(`--${BOUNDARY}--\r\n`),
    };
  }
  const head = Buffer.from(
    `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="${file.filename}"\r\nContent-Type: ${file.type}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${BOUNDARY}--\r\n`);
  return {
    headers: { "content-type": `multipart/form-data; boundary=${BOUNDARY}` },
    payload: Buffer.concat([head, Buffer.from(file.bytes), tail]),
  };
}

async function mediaApp() {
  return buildApp({
    catalog: createMemoryCatalog(),
    cache: createMemoryCache(),
    cacheTtlSeconds: 0,
    publicUrl: "http://localhost:3001",
    media: createMemoryMediaStore({ origin: "http://localhost:3001" }),
  });
}

describe("POST /media", () => {
  let app: AppInstance;

  afterEach(async () => {
    await app?.close();
  });

  it("stores a logo and returns a public url for the Metaplex uri", async () => {
    app = await mediaApp();
    const res = await app.inject({
      method: "POST",
      url: "/media",
      ...form({ bytes: PNG, type: "image/png", filename: "logo.png" }),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { url: string; id: string };
    expect(body.id).toMatch(/^[a-f0-9]+$/);
    expect(body.url).toBe(`http://localhost:3001/media/${body.id}`);

    const get = await app.inject({ method: "GET", url: `/media/${body.id}` });
    expect(get.statusCode).toBe(200);
    expect(get.headers["content-type"]).toBe("image/png");
    expect(Buffer.from(get.rawPayload).equals(Buffer.from(PNG))).toBe(true);
  });

  it("rejects a missing file", async () => {
    app = await mediaApp();
    const res = await app.inject({
      method: "POST",
      url: "/media",
      ...form(),
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "file is required" });
  });

  it("rejects an unsupported content type", async () => {
    app = await mediaApp();
    const res = await app.inject({
      method: "POST",
      url: "/media",
      ...form({ bytes: PNG, type: "application/pdf", filename: "logo.pdf" }),
    });

    expect(res.statusCode).toBe(415);
    expect(res.json()).toEqual({ error: "unsupported media type" });
  });

  it("rejects files over 2MB", async () => {
    app = await mediaApp();
    const res = await app.inject({
      method: "POST",
      url: "/media",
      ...form({
        bytes: new Uint8Array(2 * 1024 * 1024 + 1),
        type: "image/png",
        filename: "huge.png",
      }),
    });

    expect(res.statusCode).toBe(413);
    expect(res.json()).toEqual({ error: "too large" });
  });

  it("returns 404 for an unknown media id", async () => {
    app = await mediaApp();
    const res = await app.inject({ method: "GET", url: "/media/deadbeef" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "not found" });
  });
});
