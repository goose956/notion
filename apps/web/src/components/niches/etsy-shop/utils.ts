export function asText(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

export function asNumber(v: unknown): number | null {
  const n = Number(v);
  return v != null && v !== "" && Number.isFinite(n) ? n : null;
}

export function getCurrencyCode(criteria: Record<string, unknown> | null): string {
  const code = asText(criteria?.["currency-code"]).toUpperCase();
  if (/^[A-Z]{3}$/.test(code)) return code;
  return "USD";
}

export function formatCurrency(value: number | null, currencyCode: string): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Etsy fee model:
 *  - Transaction fee: 6.5% of sale price
 *  - Payment processing: ~3% + $0.25 (simplified as 3.25%)
 *  - Listing fee: $0.20 per listing (one-off, tracked separately)
 */
export function calcEtsyFees(salePrice: number): { transactionFee: number; paymentFee: number; totalFees: number } {
  const transactionFee = salePrice * 0.065;
  const paymentFee = salePrice * 0.03 + 0.25;
  const totalFees = transactionFee + paymentFee;
  return { transactionFee, paymentFee, totalFees };
}

export const ACCENT        = "#f1641e";
export const ACCENT_LIGHT  = "rgba(241,100,30,0.08)";
export const ACCENT_BORDER = "rgba(241,100,30,0.22)";

export const SHOP_TYPE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  "Digital Downloads": { bg: "rgba(59,130,246,0.10)",  color: "#1d4ed8",  label: "💾 Digital Downloads" },
  "Handmade Items":    { bg: "rgba(241,100,30,0.10)",  color: "#b45309",  label: "🤲 Handmade" },
  "Print on Demand":   { bg: "rgba(124,58,237,0.10)",  color: "#5b21b6",  label: "🖨️ Print on Demand" },
  "Vintage":           { bg: "rgba(161,140,100,0.15)", color: "#78350f",  label: "🏺 Vintage" },
  "Craft Supplies":    { bg: "rgba(5,150,105,0.10)",   color: "#065f46",  label: "🎨 Craft Supplies" },
  "Mixed":             { bg: "rgba(100,116,139,0.10)", color: "#334155",  label: "🛍️ Mixed" },
};
