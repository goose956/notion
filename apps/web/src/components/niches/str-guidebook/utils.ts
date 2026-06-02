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

export const ACCENT        = "#0891b2";
export const ACCENT_LIGHT  = "rgba(8,145,178,0.08)";
export const ACCENT_BORDER = "rgba(8,145,178,0.22)";

export const GUIDEBOOK_SECTIONS = [
  "Dining & Cafés",
  "Things to Do",
  "Supermarkets & Shops",
  "Transport & Parking",
  "Emergency & Safety",
  "Local Tips",
] as const;

export type GuidebookSection = typeof GUIDEBOOK_SECTIONS[number];

export const SECTION_ICON: Record<string, string> = {
  "Dining & Cafés":        "🍽️",
  "Things to Do":          "🎯",
  "Supermarkets & Shops":  "🛒",
  "Transport & Parking":   "🚇",
  "Emergency & Safety":    "🚨",
  "Local Tips":            "💡",
};

export const MESSAGE_TYPES = [
  "Pre-arrival",
  "Check-in Day",
  "Mid-stay Check-in",
  "Checkout Reminder",
  "Review Request",
] as const;

export const WELCOME_PACK_TYPES = [
  "Welcome Letter",
  "Check-in Guide",
  "House Rules",
  "Checkout Checklist",
  "WiFi Card",
] as const;
