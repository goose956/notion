export function asText(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

export function asNumber(v: unknown): number | null {
  const n = Number(v);
  return v != null && v !== "" && Number.isFinite(n) ? n : null;
}

export const ACCENT        = "#f97316";
export const ACCENT_LIGHT  = "rgba(249,115,22,0.08)";
export const ACCENT_BORDER = "rgba(249,115,22,0.22)";

export const PLAN_SECTIONS = [
  "Executive Summary",
  "Market Analysis",
  "Business Model",
  "Operations Plan",
  "Financial Summary",
] as const;

export type PlanSection = typeof PLAN_SECTIONS[number];

export const GOAL_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  "Quit my job":          { bg: "rgba(239,68,68,0.10)",  color: "#b91c1c",  label: "🎯 Quit my job" },
  "Get a bank loan":      { bg: "rgba(59,130,246,0.10)", color: "#1d4ed8",  label: "🏦 Bank loan" },
  "Pitch to investors":   { bg: "rgba(124,58,237,0.10)", color: "#4c1d95",  label: "💼 Investor pitch" },
  "Get organised":        { bg: "rgba(5,150,105,0.10)",  color: "#065f46",  label: "✅ Get organised" },
};
