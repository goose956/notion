import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth: unknown }) => {
  // Admin UI is intentionally accessible without forcing login.
  // Routes that actually need Notion auth enforce it at the API level
  // (e.g. deploy/sync return JSON 401 when unauthenticated).
  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Run middleware on app routes except:
     * - _next/static, _next/image, favicon.ico
     * - /api/** (API routes handle auth internally)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
