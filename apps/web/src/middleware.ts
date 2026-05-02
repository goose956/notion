import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth: unknown }) => {
  const isLoggedIn = req.auth !== null && req.auth !== undefined;
  const isAuthRoute =
    req.nextUrl.pathname.startsWith("/api/auth") ||
    req.nextUrl.pathname === "/login";

  if (!isLoggedIn && !isAuthRoute) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    /*
     * Protect all routes except:
     * - _next/static, _next/image, favicon.ico
     * - /api/health (used by Railway)
     * - /api/auth/** (NextAuth routes)
     * - /login
     */
    "/((?!_next/static|_next/image|favicon.ico|api/health|api/auth|login).*)",
  ],
};
