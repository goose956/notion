import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSettings, upsertSettings } from "@niche-factory/db";

const SETTINGS_KEYS = {
  stripeSecretKey: "stripe.secretKey",
  stripeWebhookSecret: "stripe.webhookSecret",
  anthropicApiKey: "anthropic.apiKey",
  anthropicModel: "anthropic.model",
  serperApiKey: "serper.apiKey",
  resendApiKey: "resend.apiKey",
  resendFromAddress: "resend.fromAddress",
  apifyToken: "apify.token",
} as const;

const SettingsSchema = z.object({
  stripeSecretKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  anthropicModel: z.string().optional(),
  serperApiKey: z.string().optional(),
  resendApiKey: z.string().optional(),
  resendFromAddress: z.string().optional(),
  apifyToken: z.string().optional(),
  /** Per-customer key fields — if both are present, skip global settings update */
  customerApiKeyId: z.string().optional(),
  customerApiKey: z.string().optional(),
});

export async function GET() {
  const settings = await getSettings(Object.values(SETTINGS_KEYS));

  return NextResponse.json({
    stripeSecretKeyConfigured: Boolean(settings[SETTINGS_KEYS.stripeSecretKey]),
    stripeWebhookSecretConfigured: Boolean(settings[SETTINGS_KEYS.stripeWebhookSecret]),
    anthropicApiKeyConfigured: Boolean(settings[SETTINGS_KEYS.anthropicApiKey]),
    anthropicModel: settings[SETTINGS_KEYS.anthropicModel] || "claude-sonnet-4-5",
    serperApiKeyConfigured: Boolean(settings[SETTINGS_KEYS.serperApiKey]),
    resendApiKeyConfigured: Boolean(settings[SETTINGS_KEYS.resendApiKey]),
    resendFromAddress: settings[SETTINGS_KEYS.resendFromAddress] || "",
    apifyTokenConfigured: Boolean(settings[SETTINGS_KEYS.apifyToken]),
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const data = parsed.data;

  // Per-customer key path — save and return immediately
  if (
    typeof data.customerApiKeyId === "string" &&
    data.customerApiKeyId.trim() !== "" &&
    typeof data.customerApiKey === "string" &&
    data.customerApiKey.trim() !== ""
  ) {
    const settingKey = `customer.${data.customerApiKeyId.trim()}.anthropic.apiKey`;
    await upsertSettings({ [settingKey]: data.customerApiKey.trim() });
    return NextResponse.json({ ok: true });
  }

  // Global settings path
  await upsertSettings({
    [SETTINGS_KEYS.stripeSecretKey]: data.stripeSecretKey ?? "",
    [SETTINGS_KEYS.stripeWebhookSecret]: data.stripeWebhookSecret ?? "",
    [SETTINGS_KEYS.anthropicApiKey]: data.anthropicApiKey ?? "",
    [SETTINGS_KEYS.anthropicModel]: data.anthropicModel ?? "",
    [SETTINGS_KEYS.serperApiKey]: data.serperApiKey ?? "",
    [SETTINGS_KEYS.resendApiKey]: data.resendApiKey ?? "",
    [SETTINGS_KEYS.resendFromAddress]: data.resendFromAddress ?? "",
    [SETTINGS_KEYS.apifyToken]: data.apifyToken ?? "",
  });

  return NextResponse.json({ ok: true });
}

