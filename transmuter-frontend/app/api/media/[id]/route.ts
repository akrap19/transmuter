import { join } from "node:path";
import { NextResponse } from "next/server";
import { createFileMediaStore } from "@/lib/launchpad/media-store";

type MediaGetProps = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: MediaGetProps) {
  const { id } = await params;
  const stored = createFileMediaStore({
    origin: new URL(request.url).origin,
    dir: join(process.cwd(), ".data", "media"),
  }).read(id);

  if (!stored) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(stored.bytes), {
    headers: {
      "Content-Type": stored.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
