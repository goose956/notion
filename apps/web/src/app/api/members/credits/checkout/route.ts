import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { auth } from "@/auth";
import { getSettingValue, getSettings, getUserCriteria } from "@niche-factory/db";
import { getCreditPackage } from "@/lib/credit-packages";
import {
  CREDIT_PRICING_SETTING_KEY,
  parseCreditPricingTable,
  resolvePricingCurrency,
} from "@/lib/credit-pricing";

const BodySchema = z.object({
  packageId: z.string().min(1),
});

const COUNTRY_LABEL_TO_CURRENCY: Record<string, string> = {
  "united kingdom": "GBP",
  "united states": "USD",
  canada: "CAD",
  australia: "AUD",
  "new zealand": "NZD",
  "europe (eur)": "EUR",
};

const COUNTRY_CODE_TO_CURRENCY: Record<string, string> = {
  GB: "GBP",
  US: "USD",
  CA: "CAD",
  AU: "AUD",
  NZ: "NZD",
  IE: "EUR",
  FR: "EUR",
  DE: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  PT: "EUR",
  BE: "EUR",
  AT: "EUR",
  FI: "EUR",
  GR: "EUR",
};

const SUPPORTED_CHECKOUT_CURRENCIES = new Set(["USD", "GBP", "EUR", "CAD", "AUD", "NZD"]);

function toSupportedCurrency(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return undefined;
  return SUPPORTED_CHECKOUT_CURRENCIES.has(code) ? code : undefined;
}

async function resolveCheckoutCurrency(req: NextRequest, userEmail: string): Promise<string> {
  const saved = await getUserCriteria(userEmail, "wedding-planner").catch(() => undefined);
  const criteria = (saved?.criteria ?? {}) as Record<string, unknown>;

  const fromSavedCode = toSupportedCurrency(criteria["currency-code"]);
  if (fromSavedCode) return fromSavedCode;

  const countryLabel = typeof criteria["wedding-country"] === "string"
    ? criteria["wedding-country"].trim().toLowerCase()
    : "";
  const fromCountryLabel = countryLabel ? COUNTRY_LABEL_TO_CURRENCY[countryLabel] : undefined;
  if (fromCountryLabel) return fromCountryLabel;

  const ipCountry = (req.headers.get("cf-ipcountry") ?? req.headers.get("x-vercel-ip-country") ?? "")
    .trim()
    .toUpperCase();
  const fromIp = COUNTRY_CODE_TO_CURRENCY[ipCountry];
  if (fromIp) return fromIp;

  return "USD";
}

async function resolveCheckoutAmountCents(packageId: string, currency: string, fallbackCents: number): Promise<number> {
  const raw = await getSettingValue(CREDIT_PRICING_SETTING_KEY).catch(() => undefined);
  const table = parseCreditPricingTable(raw);
  const row = table[packageId];
  if (!row) return fallbackCents;
  const resolvedCurrency = resolvePricingCurrency(currency);
  const cents = row[resolvedCurrency];
  if (typeof cents === "number" && Number.isFinite(cents) && cents > 0) {
    return Math.round(cents);
  }
  return fallbackCents;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const pkg = getCreditPackage(parsed.data.packageId);
  if (!pkg) {
    return NextResponse.json({ error: "Unknown package" }, { status: 400 });
  }

  const settings = await getSettings(["stripe.secretKey"]);
  const stripeSecret = settings["stripe.secretKey"] || process.env["STRIPE_SECRET_KEY"] || "";
  if (!stripeSecret) {
    return NextResponse.json({ error: "Stripe secret key is not configured" }, { status: 503 });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2026-04-22.dahlia" });
  const currency = resolvePricingCurrency(await resolveCheckoutCurrency(req, session.user.email));
  const unitAmount = await resolveCheckoutAmountCents(pkg.id, currency, pkg.priceCents);

  const origin = req.nextUrl.origin;
  const successUrl = `${origin}/members/credits?status=success&package=${encodeURIComponent(pkg.id)}`;
  const cancelUrl = `${origin}/members/credits?status=cancelled`;

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: session.user.email,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: unitAmount,
            product_data: {
              name: `${pkg.credits} Credits`,
              description: `${pkg.name} credit package`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        kind: "credits",
        packageId: pkg.id,
        credits: String(pkg.credits),
        userEmail: session.user.email,
        currency,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    if (!checkout.url) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
