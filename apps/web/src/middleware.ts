import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Edge runtime compatible check — no Node crypto available in middleware.
// The login server action sets the cookie using btoa(pw + salt).
function isValidAdminCookie(cookie: string | undefined): boolean {
  if (!cookie) return false;
  const pw = process.env["ADMIN_PASSWORD"] ?? "changeme";
  const expected = btoa(pw + "niche-admin-salt").replace(/=/g, "");
  return cookie === expected;
}

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;

  // ── Admin password wall ────────────────────────────────────────────────────
  // Protect all /admin/* routes except the login page itself
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const cookie = req.cookies.get("admin_auth")?.value;
    if (!isValidAdminCookie(cookie)) {
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
