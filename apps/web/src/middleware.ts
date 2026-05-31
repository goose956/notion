import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash } from "crypto";

function adminToken() {
  const pw = process.env["ADMIN_PASSWORD"] ?? "changeme";
  return createHash("sha256").update(pw + "niche-admin-salt").digest("hex");
}

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;

  // ── Admin password wall ────────────────────────────────────────────────────
  // Protect all /admin/* routes except the login page itself
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const cookie = req.cookies.get("admin_auth")?.value;
    if (cookie !== adminToken()) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

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
