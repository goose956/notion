import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { verifyMagicToken } from "@/lib/magic-link";

function resolveSafeCallbackUrl(callbackUrl: string | undefined): string {
  if (!callbackUrl) return "/members/connections";
  if (callbackUrl === "undefined" || callbackUrl.endsWith("/undefined")) return "/members/connections";
  if (!callbackUrl.startsWith("/")) return "/members/connections";
  return callbackUrl;
}

export default async function VerifiedPage({
  searchParams,
}: {
  searchParams: { token?: string; callbackUrl?: string };
}) {
  const { token, callbackUrl } = searchParams;

  if (!token) {
    redirect("/login?error=invalid-link");
  }

  const secret = process.env["AUTH_SECRET"] ?? "";
  const email = verifyMagicToken(token, secret);

  if (!email) {
    redirect("/login?error=expired-link");
  }

  const safeCallbackUrl = resolveSafeCallbackUrl(callbackUrl);

  // Sign in via the credentials provider — this will redirect on success
  await signIn("email", { email, redirectTo: safeCallbackUrl });
}
