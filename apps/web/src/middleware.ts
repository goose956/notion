import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth: unknown }) => {
  const isLoggedIn = req.auth !== null && req.auth !== undefined;
  const isAuthRoute =
    req.nextUrl.pathname.startsWith("/api/auth") ||
    req.nextUrl.pathname === "/login";

  // API routes handle their own auth and return JSON 401 — don't redirect them
  const isApiRoute = req.nextUrl.pathname.startsWith("/api/");

  if (!isLoggedIn && !isAuthRoute && !isApiRoute) {
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
     * - /api/** (API routes handle auth internally)
     * - /login
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|login).*)",
  ],
};
