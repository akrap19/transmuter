import { describe, expect, it, vi } from "vitest";
import { dataUrlToUpload, uploadMedia } from "./media";

describe("uploadMedia", () => {
  it("POSTs bytes to the media endpoint and returns the stored url", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://cdn.example/media/logo.png" }),
    });

    const result = await uploadMedia(
      {
        bytes: new Uint8Array([1, 2, 3]),
        contentType: "image/png",
        filename: "logo.png",
      },
      { endpoint: "https://api.example/media", fetchFn },
    );

    expect(result.url).toBe("https://cdn.example/media/logo.png");
    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example/media");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("throws when the upload endpoint rejects the file", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
      json: async () => ({ error: "too large" }),
    });

    await expect(
      uploadMedia(
        { bytes: new Uint8Array([1]), contentType: "image/png", filename: "logo.png" },
        { endpoint: "/api/media", fetchFn },
      ),
    ).rejects.toThrow(/too large|413/i);
  });
});

describe("dataUrlToUpload", () => {
  it("decodes a PNG data URL into bytes for object storage", () => {
    const png = dataUrlToUpload("data:image/png;base64,AQID", "logo.png");
    expect(png.contentType).toBe("image/png");
    expect(png.filename).toBe("logo.png");
    expect(Array.from(png.bytes)).toEqual([1, 2, 3]);
  });
});
