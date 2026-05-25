import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSettingValue, upsertSetting } from "@niche-factory/db";
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
});

function sanitizeTable(input: Record<string, Record<string, number>>): CreditPricingTable {
  const raw = JSON.stringify(input);
  return parseCreditPricingTable(raw);
}

export async function GET() {
  const raw = await getSettingValue(CREDIT_PRICING_SETTING_KEY);
  const table = parseCreditPricingTable(raw);

  return NextResponse.json({
    currencies: CREDIT_PRICING_CURRENCIES,
    packages: CREDIT_PACKAGES,
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

  return NextResponse.json({
    ok: true,
    currencies: CREDIT_PRICING_CURRENCIES as readonly CreditPricingCurrency[],
    packages: CREDIT_PACKAGES,
    table: sanitized,
  });
}
