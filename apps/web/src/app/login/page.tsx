import { redirect } from "next/navigation";
import { CheckCircle2, Mail } from "lucide-react";
import { getSettingValue } from "@niche-factory/db";
import { buildMagicLink } from "@/lib/magic-link";

function resolveSafeCallbackUrl(callbackUrl: string | undefined): string {
  if (!callbackUrl) return "/members/connections";
  if (callbackUrl === "undefined" || callbackUrl.endsWith("/undefined")) return "/members/connections";
  if (!callbackUrl.startsWith("/")) return "/members/connections";
  return callbackUrl;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  const callbackUrl = resolveSafeCallbackUrl(searchParams.callbackUrl);
  const errorCode = searchParams.error;

  const errorMessages: Record<string, string> = {
    "email-not-configured": "Email sending is not configured yet. Please contact support.",
    "send-failed": "Failed to send the sign-in email. Please try again.",
    "invalid-link": "That sign-in link is invalid. Please request a new one.",
    "expired-link": "That sign-in link has expired. Links are valid for 15 minutes — please request a new one.",
    "sign-in-failed": "Sign-in failed unexpectedly. Please request a new link.",
  };
  const errorMessage = errorCode ? (errorMessages[errorCode] ?? "Something went wrong. Please try again.") : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/s-logo.png" alt="Stridivo" className="h-16 w-auto" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sign in to Stridivo</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a sign-in link
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <form
          action={async (formData: FormData) => {
            "use server";
            const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
            if (!email || !email.includes("@")) return;

            const [apiKey, fromAddress] = await Promise.all([
              getSettingValue("resend.apiKey"),
              getSettingValue("resend.fromAddress"),
            ]);

            if (!apiKey?.trim()) {
              redirect(`/login?error=email-not-configured&callbackUrl=${encodeURIComponent(callbackUrl)}`);
            }

            const secret = process.env["AUTH_SECRET"] ?? "";
            const baseUrl =
              process.env["AUTH_URL"] ??
              process.env["NEXTAUTH_URL"] ??
              "http://localhost:3000";

            const magicLink = buildMagicLink(email, secret, baseUrl, callbackUrl);
            const from = fromAddress?.trim() || "noreply@stridivo.com";

            const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in to Stridivo</title>
</head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;border:1px solid #e8e8e8;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#E83D00;padding:28px 40px;text-align:center;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Stridivo</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111;">Your sign-in link</p>
              <p style="margin:0 0 28px;font-size:15px;color:#555;line-height:1.5;">
                Click the button below to sign in to your Stridivo account. This link is valid for <strong>30 minutes</strong> and can only be used once.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background:#E83D00;border-radius:6px;">
                    <a href="${magicLink}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.2px;">
                      Sign in to Stridivo
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 6px;font-size:13px;color:#888;">If the button doesn&apos;t work, copy and paste this link:</p>
              <p style="margin:0;font-size:12px;color:#E83D00;word-break:break-all;">${magicLink}</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">
                If you didn&apos;t request this email you can safely ignore it &mdash; your account won&apos;t be affected.<br />
                &copy; ${new Date().getFullYear()} Stridivo
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

            try {
              const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey.trim()}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from,
                  to: [email],
                  subject: "Sign in to Stridivo",
                  html: emailHtml,
                }),
              });

              if (!res.ok) {
                redirect(`/login?error=send-failed&callbackUrl=${encodeURIComponent(callbackUrl)}`);
              }
            } catch {
              redirect(`/login?error=send-failed&callbackUrl=${encodeURIComponent(callbackUrl)}`);
            }

            redirect(`/login/check-email?email=${encodeURIComponent(email)}`);
          }}
          className="space-y-3"
        >
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send sign-in link
            </span>
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          You can connect Notion, Airtable and other integrations from your account after signing in.
        </p>

        <ul className="space-y-2 border-t pt-4">
          {[
            "AI niche workspaces built in seconds",
            "AI assistant pre-loaded with your niche context",
            "25 free research credits included on signup",
          ].map((feat) => (
            <li key={feat} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              {feat}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
