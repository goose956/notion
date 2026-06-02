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
    maximumFractionDigits: 0,
  }).format(value);
}

export const ACCENT        = "#6366f1";
export const ACCENT_LIGHT  = "rgba(99,102,241,0.08)";
export const ACCENT_BORDER = "rgba(99,102,241,0.22)";

export const PLATFORM_EMOJI: Record<string, string> = {
  "YouTube":       "▶️",
  "TikTok":        "🎵",
  "Instagram":     "📸",
  "Twitter/X":     "🐦",
  "Blog":          "✍️",
  "Podcast":       "🎙️",
  "LinkedIn":      "💼",
  "Multi-platform": "🌐",
};

export const GOAL_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  "Grow my audience":       { bg: "rgba(99,102,241,0.09)",  color: "#3730a3",  label: "📈 Growing audience" },
  "Monetise my channel":    { bg: "rgba(217,119,6,0.09)",   color: "#92400e",  label: "💰 Monetising" },
  "Land brand deals":       { bg: "rgba(236,72,153,0.09)",  color: "#831843",  label: "🤝 Brand deals" },
  "Build my personal brand":{ bg: "rgba(16,185,129,0.09)",  color: "#065f46",  label: "⭐ Personal brand" },
  "Side income":            { bg: "rgba(245,158,11,0.09)",  color: "#78350f",  label: "💸 Side income" },
};
