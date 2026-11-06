import { NextResponse, type NextRequest } from "next/server";
import { isIndexableHost, siteAllowsIndexing } from "@/lib/seo/indexing";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (!siteAllowsIndexing() || !isIndexableHost(request.headers.get("host"))) {
    response.headers.set("X-Robots-Tag", "noindex");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
