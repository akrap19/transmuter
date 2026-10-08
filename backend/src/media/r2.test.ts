import { describe, expect, it } from "vitest";
import { MEDIA_CACHE_CONTROL, createR2MediaStore, mediaExtension, publicObjectUrl, type R2Client } from "./r2.ts";

function fakeClient(): R2Client & { puts: Array<{ key: string; contentType: string; cacheControl: string; body: Uint8Array }> } {
  const objects = new Map<string, { body: Uint8Array; contentType: string }>();
  const puts: Array<{ key: string; contentType: string; cacheControl: string; body: Uint8Array }> = [];
  return {
    puts,
    async put(input) {
      puts.push(input);
      objects.set(input.key, { body: input.body, contentType: input.contentType });
    },
    async get(key) {
      return objects.get(key) ?? null;
    },
  };
}

describe("createR2MediaStore", () => {
  it("uploads with a public cache header and returns the Cloudflare URL", async () => {
    const client = fakeClient();
    const store = createR2MediaStore({ publicUrl: "https://media.transmuter.net/", client });
    const bytes = new Uint8Array([137, 80, 78, 71]);

    const saved = await store.save({ bytes, contentType: "image/png", filename: "logo.png" });

    expect(saved.id).toMatch(/^[a-f0-9]{32}$/);
    expect(saved.url).toBe(`https://media.transmuter.net/${saved.id}.png`);
    expect(client.puts).toEqual([
      {
        key: `${saved.id}.png`,
        body: bytes,
        contentType: "image/png",
        cacheControl: MEDIA_CACHE_CONTROL,
      },
    ]);

    const stored = await store.read(saved.id);
    expect(stored?.contentType).toBe("image/png");
    expect(Array.from(stored!.bytes)).toEqual([137, 80, 78, 71]);
  });

  it("stores metadata JSON beside the image", async () => {
    const client = fakeClient();
    const store = createR2MediaStore({ publicUrl: "https://media.transmuter.net", client });
    const saved = await store.save({
      bytes: new Uint8Array([123, 125]),
      contentType: "application/json",
      filename: "aero.json",
    });

    expect(saved.url).toBe(`https://media.transmuter.net/${saved.id}.json`);
    expect(mediaExtension("image/jpeg")).toBe(".jpg");
    expect(publicObjectUrl("https://media.transmuter.net", `${saved.id}.json`)).toBe(saved.url);
  });
});
