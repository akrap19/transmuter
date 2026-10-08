export type MediaUpload = {
  bytes: Uint8Array;
  contentType: string;
  filename: string;
};

export type UploadMediaOptions = {
  endpoint: string;
  fetchFn?: typeof fetch;
};

const DEFAULT_MEDIA_PATH = "/api/media";

function browserOrigin(explicit?: string | null): string | null {
  if (explicit !== undefined) return explicit;
  if (typeof window === "undefined") return null;
  return window.location.origin;
}

/** Browser uploads use same-origin `/api/media` when the read API is on another host (avoids CORS in local dev). */
export function resolveMediaEndpoint(
  env: Record<string, string | undefined> = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  locationOrigin?: string | null,
): string {
  const base = (env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  if (!base) return DEFAULT_MEDIA_PATH;

  const origin = browserOrigin(locationOrigin);
  if (origin) {
    try {
      if (new URL(base).origin !== origin) {
        return DEFAULT_MEDIA_PATH;
      }
    } catch {
      return DEFAULT_MEDIA_PATH;
    }
  }

  return `${base}/media`;
}

/** Server-side upload target. The browser posts to `/api/media`, which forwards here so bytes land on R2. */
export function upstreamMediaUrl(
  env: Record<string, string | undefined> = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
): string | null {
  const base = (env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/$/, "");
  if (!base) return null;
  return `${base}/media`;
}

export async function uploadMedia(
  file: MediaUpload,
  options: UploadMediaOptions,
): Promise<{ url: string }> {
  const fetchFn = options.fetchFn ?? fetch;
  const form = new FormData();
  const copy = new Uint8Array(file.bytes.byteLength);
  copy.set(file.bytes);
  form.append("file", new File([copy.buffer], file.filename, { type: file.contentType }));

  const response = await fetchFn(options.endpoint, {
    method: "POST",
    body: form,
  });

  const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !body.url) {
    throw new Error(body.error ?? `media upload failed (${response.status})`);
  }
  return { url: body.url };
}

export function dataUrlToUpload(dataUrl: string, filename: string): MediaUpload {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("logo must be a base64 data URL");
  }
  return {
    contentType: match[1],
    filename,
    bytes: Uint8Array.from(Buffer.from(match[2], "base64")),
  };
}
