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

export const ACCENT        = "#dc2626";
export const ACCENT_LIGHT  = "rgba(220,38,38,0.07)";
export const ACCENT_BORDER = "rgba(220,38,38,0.20)";

export const PLAN_SECTIONS = [
  "Executive Summary",
  "Market Analysis",
  "Operations Plan",
  "Financial Plan",
  "Food Safety & Compliance",
] as const;

export type PlanSection = typeof PLAN_SECTIONS[number];

export const GOAL_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  "Open a food business":       { bg: "rgba(220,38,38,0.09)",  color: "#991b1b",  label: "🍽️ Open a food business" },
  "Get a business loan":        { bg: "rgba(59,130,246,0.09)", color: "#1d4ed8",  label: "🏦 Business loan" },
  "Start a side income":        { bg: "rgba(5,150,105,0.09)",  color: "#065f46",  label: "💰 Side income" },
  "Scale an existing business": { bg: "rgba(124,58,237,0.09)", color: "#4c1d95",  label: "📈 Scale up" },
};
