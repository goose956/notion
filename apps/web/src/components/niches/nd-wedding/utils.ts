export function asText(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

export function asNumber(v: unknown): number | null {
  const n = Number(v);
  return v != null && v !== "" && Number.isFinite(n) ? n : null;
}

export type EnergyLevel = "Low 🔋" | "Medium ⚡" | "High 🚀";
export const ENERGY_LEVELS: EnergyLevel[] = ["Low 🔋", "Medium ⚡", "High 🚀"];

export const ENERGY_EMOJI: Record<EnergyLevel, string> = {
  "Low 🔋":    "🔋",
  "Medium ⚡": "⚡",
  "High 🚀":   "🚀",
};

export const ENERGY_COLOR: Record<EnergyLevel, { bg: string; border: string; text: string; activeBg: string; activeBorder: string }> = {
  "Low 🔋": {
    bg:           "rgba(5,150,105,0.06)",
    border:       "rgba(5,150,105,0.18)",
    text:         "#065f46",
    activeBg:     "rgba(5,150,105,0.14)",
    activeBorder: "#059669",
  },
  "Medium ⚡": {
    bg:           "rgba(217,119,6,0.06)",
    border:       "rgba(217,119,6,0.18)",
    text:         "#92400e",
    activeBg:     "rgba(217,119,6,0.14)",
    activeBorder: "#d97706",
  },
  "High 🚀": {
    bg:           "rgba(124,58,237,0.06)",
    border:       "rgba(124,58,237,0.18)",
    text:         "#4c1d95",
    activeBg:     "rgba(124,58,237,0.14)",
    activeBorder: "#7c3aed",
  },
};

export const ACCENT       = "#7c3aed";
export const ACCENT_LIGHT = "rgba(124,58,237,0.08)";
export const ACCENT_BORDER = "rgba(124,58,237,0.22)";

export function parseWeddingDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

export function daysUntil(d: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}
