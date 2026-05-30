import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findOrCreateCustomer, upsertUserCriteria, getSettingValue } from "@niche-factory/db";

const BodySchema = z.object({
  email: z.string().email(),
  nicheId: z.string().min(1).optional(),
  onboardingAnswers: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 422 });
  }

  try {
    await findOrCreateCustomer(parsed.data.email);
    if (parsed.data.nicheId && parsed.data.onboardingAnswers && Object.keys(parsed.data.onboardingAnswers).length > 0) {
      await upsertUserCriteria(parsed.data.email, parsed.data.nicheId, parsed.data.onboardingAnswers).catch(() => null);
    }
  } catch {
    // Non-fatal — customer row creation failure shouldn't block sign-up
  }

  // Send welcome email (non-blocking — failure doesn't break signup)
  void sendWelcomeEmail(parsed.data.email).catch(() => null);

  return NextResponse.json({ ok: true });
}

async function sendWelcomeEmail(email: string): Promise<void> {
  const [apiKey, fromAddress] = await Promise.all([
    getSettingValue("resend.apiKey"),
    getSettingValue("resend.fromAddress"),
  ]);
  if (!apiKey?.trim()) return;

  const from = fromAddress?.trim() || "noreply@stridivo.com";
  const loginUrl = `${process.env["AUTH_URL"] ?? process.env["NEXTAUTH_URL"] ?? "https://stridivo.com"}/login`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Stridivo</title>
</head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;border:1px solid #e8e8e8;overflow:hidden;">
          <tr>
            <td style="background:#E83D00;padding:28px 40px;text-align:center;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Stridivo</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111;">Welcome aboard!</p>
              <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.6;">
                Your Stridivo account is live and your workspace is ready to go. You&apos;ve got <strong>25 free research credits</strong> to get started &mdash; use them to find venues, vendors, and suppliers.
              </p>
              <p style="margin:0 0 8px;font-size:13px;color:#888;">
                Next time you need to sign in from a new device, just head to:
              </p>
              <p style="margin:0 0 28px;font-size:13px;">
                <a href="${loginUrl}" style="color:#E83D00;">${loginUrl}</a>
              </p>
              <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
                Enter your email and we&apos;ll send you a one-click sign-in link &mdash; no password needed.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">
                You&apos;re receiving this because you signed up at stridivo.com.<br />
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

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Welcome to Stridivo — your workspace is ready",
      html,
    }),
  });
}
