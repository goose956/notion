import { type NextRequest, NextResponse } from "next/server";
import { signIn } from "@/auth";

// Direct login as demo@stridivo.com - no email required.
// Only works when DEMO_LOGIN_ENABLED=true is set in env.
export async function GET(req: NextRequest) {
  if (process.env["DEMO_LOGIN_ENABLED"] !== "true") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "/members/workspace";

  try {
    await signIn("email", { email: "demo@stridivo.com", redirectTo: callbackUrl });
  } catch (err: unknown) {
    const digest = (err as { digest?: string }).digest ?? "";
    if (digest.startsWith("NEXT_REDIRECT")) throw err;
    return NextResponse.redirect(new URL("/login?error=sign-in-failed", req.url));
  }

  return NextResponse.redirect(new URL(callbackUrl, req.url));
}
