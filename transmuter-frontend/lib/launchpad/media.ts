export type MediaUpload = {
  bytes: Uint8Array;
  contentType: string;
  filename: string;
};

export type UploadMediaOptions = {
  endpoint: string;
  fetchFn?: typeof fetch;
};

export function resolveMediaEndpoint(env: Record<string, string | undefined> = process.env): string {
  const base = (env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  return base ? `${base}/media` : "/api/media";
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
