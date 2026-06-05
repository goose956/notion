import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSettingValue, upsertSetting, getSettings } from "@niche-factory/db";
import { CREDIT_PACKAGES } from "@/lib/credit-packages";
import {
  CREDIT_PRICING_CURRENCIES,
  CREDIT_PRICING_SETTING_KEY,
  parseCreditPricingTable,
  serializeCreditPricingTable,
  type CreditPricingCurrency,
  type CreditPricingTable,
} from "@/lib/credit-pricing";

export const dynamic = "force-dynamic";

const RowSchema = z.record(z.string(), z.number().int().positive());
const BodySchema = z.object({
  table: z.record(z.string(), RowSchema),
  credits: z.record(z.string(), z.number().int().min(1)).optional(),
});

function sanitizeTable(input: Record<string, Record<string, number>>): CreditPricingTable {
  const raw = JSON.stringify(input);
  return parseCreditPricingTable(raw);
}

const CREDIT_AMOUNTS_KEY = "credits.amounts.v1";

export async function GET() {
  const settings = await getSettings([CREDIT_PRICING_SETTING_KEY, CREDIT_AMOUNTS_KEY]);
  const table = parseCreditPricingTable(settings[CREDIT_PRICING_SETTING_KEY]);

  // Merge stored credit amounts over the hardcoded defaults
  let storedAmounts: Record<string, number> = {};
  try {
    if (settings[CREDIT_AMOUNTS_KEY]) {
      storedAmounts = JSON.parse(settings[CREDIT_AMOUNTS_KEY]) as Record<string, number>;
    }
  } catch { /* ignore */ }

  const packages = CREDIT_PACKAGES.map((pkg) => ({
    ...pkg,
    credits: storedAmounts[pkg.id] ?? pkg.credits,
  }));

  return NextResponse.json({
    currencies: CREDIT_PRICING_CURRENCIES,
    packages,
    table,
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const sanitized = sanitizeTable(parsed.data.table);
  await upsertSetting(CREDIT_PRICING_SETTING_KEY, serializeCreditPricingTable(sanitized));

  // Save credit amounts if provided
  if (parsed.data.credits) {
    const amounts: Record<string, number> = {};
    for (const pkg of CREDIT_PACKAGES) {
      const val = parsed.data.credits[pkg.id];
      if (typeof val === "number" && val > 0) amounts[pkg.id] = val;
    }
    await upsertSetting(CREDIT_AMOUNTS_KEY, JSON.stringify(amounts));
  }

  return NextResponse.json({
    ok: true,
    currencies: CREDIT_PRICING_CURRENCIES as readonly CreditPricingCurrency[],
    packages: CREDIT_PACKAGES,
    table: sanitized,
  });
}
