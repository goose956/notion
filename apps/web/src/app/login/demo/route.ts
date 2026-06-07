import { type NextRequest, NextResponse } from "next/server";
import { buildMagicLink } from "@/lib/magic-link";

// Direct login as demo@stridivo.com - no email required.
// Only works when DEMO_LOGIN_ENABLED=true is set in env.
export async function GET(req: NextRequest) {
  if (process.env["DEMO_LOGIN_ENABLED"] !== "true") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "/members/workspace";
  const secret = process.env["AUTH_SECRET"] ?? "";
  const origin = req.nextUrl.origin;

  const magicUrl = buildMagicLink("demo@stridivo.com", secret, origin, callbackUrl);
  return NextResponse.redirect(magicUrl);
}
