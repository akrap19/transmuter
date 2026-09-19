import { describe, expect, it } from "vitest";
import { createMemoryMediaStore } from "./media-store";

describe("createMemoryMediaStore", () => {
  it("stores uploaded bytes and returns a public url for the Metaplex uri", () => {
    const store = createMemoryMediaStore({ origin: "http://localhost:3000" });
    const saved = store.save({
      bytes: new Uint8Array([9, 8, 7]),
      contentType: "image/png",
      filename: "logo.png",
    });

    expect(saved.url).toMatch(/^http:\/\/localhost:3000\/api\/media\//);
    const read = store.read(saved.id);
    expect(read?.contentType).toBe("image/png");
    expect(Array.from(read!.bytes)).toEqual([9, 8, 7]);
  });

  it("returns null for an unknown id", () => {
    const store = createMemoryMediaStore({ origin: "http://localhost:3000" });
    expect(store.read("missing")).toBeNull();
  });
});
