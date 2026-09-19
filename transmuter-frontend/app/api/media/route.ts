import { join } from "node:path";
import { NextResponse } from "next/server";
import { createFileMediaStore } from "@/lib/launchpad/media-store";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/json",
]);

function store(origin: string) {
  return createFileMediaStore({
    origin,
    dir: join(process.cwd(), ".data", "media"),
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too large" }, { status: 413 });
  }
  const contentType = file.type || "application/octet-stream";
  if (!ALLOWED.has(contentType)) {
    return NextResponse.json({ error: "unsupported media type" }, { status: 415 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const saved = store(new URL(request.url).origin).save({
    bytes,
    contentType,
    filename: file.name || "upload",
  });
  return NextResponse.json({ url: saved.url, id: saved.id });
}
