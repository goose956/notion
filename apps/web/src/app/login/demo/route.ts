import { type NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";

// Direct login as demo@stridivo.com - bypasses email flow entirely.
// Only works when DEMO_LOGIN_ENABLED=true is set in env.
export async function GET(req: NextRequest) {
  if (process.env["DEMO_LOGIN_ENABLED"] !== "true") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const secret = process.env["AUTH_SECRET"] ?? "";
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "/members/workspace";
  const isHttps = req.nextUrl.protocol === "https:";

  // Build a NextAuth v5 session token directly - same shape as what
  // signIn("email", ...) would create via the Credentials provider.
  const now = Math.floor(Date.now() / 1000);
  const sessionToken = await encode({
    token: {
      sub: "demo@stridivo.com",
      email: "demo@stridivo.com",
      name: "demo",
      iat: now,
      exp: now + 60 * 60 * 24 * 30, // 30 days
      jti: crypto.randomUUID(),
    },
    secret,
    salt: isHttps ? "__Secure-authjs.session-token" : "authjs.session-token",
  });

  // Cookie name differs between HTTP and HTTPS (Auth.js v5 convention)
  const cookieName = isHttps
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const response = NextResponse.redirect(new URL(callbackUrl, req.url));
  response.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}
