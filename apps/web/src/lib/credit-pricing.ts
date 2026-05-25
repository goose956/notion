import { CREDIT_PACKAGES } from "@/lib/credit-packages";

export const CREDIT_PRICING_SETTING_KEY = "credits.pricing.table.v1";

export const CREDIT_PRICING_CURRENCIES = ["USD", "GBP", "EUR"] as const;
export type CreditPricingCurrency = (typeof CREDIT_PRICING_CURRENCIES)[number];

export type CreditPricingTable = Record<string, Record<CreditPricingCurrency, number>>;

const GBP_FACTOR = 0.8;
const EUR_FACTOR = 0.92;

function roundToCharmCents(valueCents: number): number {
  const units = valueCents / 100;
  const rounded = Math.max(1, Math.round(units));
  return rounded * 100;
}

function buildDefaultPricingTable(): CreditPricingTable {
  const table: CreditPricingTable = {};
  for (const pkg of CREDIT_PACKAGES) {
    table[pkg.id] = {
      USD: pkg.priceCents,
      GBP: roundToCharmCents(pkg.priceCents * GBP_FACTOR),
      EUR: roundToCharmCents(pkg.priceCents * EUR_FACTOR),
    };
  }
  return table;
}

export const DEFAULT_CREDIT_PRICING_TABLE = buildDefaultPricingTable();

function isCurrency(value: string): value is CreditPricingCurrency {
  return (CREDIT_PRICING_CURRENCIES as readonly string[]).includes(value);
}

export function parseCreditPricingTable(raw: string | undefined): CreditPricingTable {
  const base: CreditPricingTable = JSON.parse(JSON.stringify(DEFAULT_CREDIT_PRICING_TABLE)) as CreditPricingTable;
  if (!raw || raw.trim() === "") return base;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const pkg of CREDIT_PACKAGES) {
      const row = parsed[pkg.id];
      if (!row || typeof row !== "object") continue;
      const targetRow = base[pkg.id];
      if (!targetRow) continue;
      for (const currency of CREDIT_PRICING_CURRENCIES) {
        const val = (row as Record<string, unknown>)[currency];
        if (typeof val === "number" && Number.isFinite(val) && val > 0) {
          targetRow[currency] = Math.round(val);
        }
      }
    }
  } catch {
    return base;
  }

  return base;
}

export function serializeCreditPricingTable(table: CreditPricingTable): string {
  const sanitized: CreditPricingTable = JSON.parse(JSON.stringify(DEFAULT_CREDIT_PRICING_TABLE)) as CreditPricingTable;
  for (const pkg of CREDIT_PACKAGES) {
    const row = table[pkg.id];
    const targetRow = sanitized[pkg.id];
    if (!targetRow) continue;
    if (!row) continue;
    for (const currency of CREDIT_PRICING_CURRENCIES) {
      const val = row[currency];
      if (typeof val === "number" && Number.isFinite(val) && val > 0) {
        targetRow[currency] = Math.round(val);
      }
    }
  }
  return JSON.stringify(sanitized);
}

export function centsToMajorString(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function majorToCents(value: string): number | null {
  const normalized = value.trim();
  if (normalized === "") return null;
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

export function resolvePricingCurrency(code: string | undefined): CreditPricingCurrency {
  const upper = (code ?? "").trim().toUpperCase();
  return isCurrency(upper) ? upper : "USD";
}
