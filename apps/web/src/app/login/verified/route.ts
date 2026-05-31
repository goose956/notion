import { type NextRequest, NextResponse } from "next/server";
import { signIn } from "@/auth";
import { verifyMagicToken } from "@/lib/magic-link";

function resolveSafeCallbackUrl(callbackUrl: string | null | undefined): string {
  if (!callbackUrl) return "/members/connections";
  if (callbackUrl === "undefined" || callbackUrl.endsWith("/undefined")) return "/members/connections";
  if (!callbackUrl.startsWith("/")) return "/members/connections";
  return callbackUrl;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get("token");
  const callbackUrl = searchParams.get("callbackUrl");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid-link", req.url));
  }

  const secret = process.env["AUTH_SECRET"] ?? "";
  const email = verifyMagicToken(token, secret);

  if (!email) {
    return NextResponse.redirect(new URL("/login?error=expired-link", req.url));
  }

  const safeCallbackUrl = resolveSafeCallbackUrl(callbackUrl);

  try {
    // signIn with redirectTo throws a NEXT_REDIRECT which Next.js handles as a response.
    await signIn("email", { email, redirectTo: safeCallbackUrl });
  } catch (err: unknown) {
    // NEXT_REDIRECT errors must be re-thrown — they are how Next.js performs redirects.
    const digest = (err as { digest?: string }).digest ?? "";
    if (digest.startsWith("NEXT_REDIRECT")) throw err;
    // Any other error (e.g. AuthError) → send back to login with error.
    console.error("[/login/verified] signIn failed:", err);
    return NextResponse.redirect(new URL("/login?error=sign-in-failed", req.url));
  }

  // Fallback — signIn with redirectTo should have thrown NEXT_REDIRECT above.
  return NextResponse.redirect(new URL(safeCallbackUrl, req.url));
}
