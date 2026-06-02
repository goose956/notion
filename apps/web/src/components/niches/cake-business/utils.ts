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
  return "GBP";
}

export function formatCurrency(value: number | null, currencyCode: string): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}

export const ACCENT        = "#db2777";
export const ACCENT_LIGHT  = "rgba(219,39,119,0.07)";
export const ACCENT_BORDER = "rgba(219,39,119,0.22)";

export const PLAN_SECTIONS = [
  "Executive Summary",
  "Product Range & Pricing",
  "Sales & Marketing",
  "Operations & Kitchen Setup",
  "Financial Plan",
  "Food Safety & Compliance",
] as const;

export type PlanSection = typeof PLAN_SECTIONS[number];

export const GOAL_BADGE: Record<string, { label: string }> = {
  "Start a cake business":        { label: "🎂 Start a cake business" },
  "Grow an existing business":    { label: "📈 Grow existing business" },
  "Go full-time from part-time":  { label: "🕐 Go full-time" },
  "Get business funding":         { label: "🏦 Get funding" },
};

export const ORDER_STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  "Enquiry":      { bg: "rgba(148,163,184,0.12)", color: "#475569" },
  "Quoted":       { bg: "rgba(245,158,11,0.10)",  color: "#92400e" },
  "Confirmed":    { bg: "rgba(59,130,246,0.10)",  color: "#1d4ed8" },
  "Deposit Paid": { bg: "rgba(249,115,22,0.10)",  color: "#c2410c" },
  "In Progress":  { bg: "rgba(124,58,237,0.10)",  color: "#4c1d95" },
  "Completed":    { bg: "rgba(5,150,105,0.10)",   color: "#065f46" },
  "Cancelled":    { bg: "rgba(220,38,38,0.10)",   color: "#b91c1c" },
};
