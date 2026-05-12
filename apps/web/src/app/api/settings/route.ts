import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSettings, upsertSettings } from "@niche-factory/db";

const SETTINGS_KEYS = {
  stripeSecretKey: "stripe.secretKey",
  stripeWebhookSecret: "stripe.webhookSecret",
  anthropicApiKey: "anthropic.apiKey",
  anthropicModel: "anthropic.model",
} as const;

const SettingsSchema = z.object({
  stripeSecretKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  anthropicModel: z.string().optional(),
});

export async function GET() {
  const settings = await getSettings(Object.values(SETTINGS_KEYS));

  return NextResponse.json({
    stripeSecretKeyConfigured: Boolean(settings[SETTINGS_KEYS.stripeSecretKey]),
    stripeWebhookSecretConfigured: Boolean(settings[SETTINGS_KEYS.stripeWebhookSecret]),
    anthropicApiKeyConfigured: Boolean(settings[SETTINGS_KEYS.anthropicApiKey]),
    anthropicModel: settings[SETTINGS_KEYS.anthropicModel] || "claude-3-5-sonnet-20241022",
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

  await upsertSettings({
    [SETTINGS_KEYS.stripeSecretKey]: data.stripeSecretKey ?? "",
    [SETTINGS_KEYS.stripeWebhookSecret]: data.stripeWebhookSecret ?? "",
    [SETTINGS_KEYS.anthropicApiKey]: data.anthropicApiKey ?? "",
    [SETTINGS_KEYS.anthropicModel]: data.anthropicModel ?? "",
  });

  return NextResponse.json({ ok: true });
}
