export const ACCENT        = "#2563eb";
export const ACCENT_LIGHT  = "rgba(37,99,235,0.07)";
export const ACCENT_BORDER = "rgba(37,99,235,0.22)";
export const ACCENT_TEXT   = "#1e40af";

// ── Teacher design system ────────────────────────────────────────────────────
// Backgrounds
export const T_BG       = "#eef2f7";   // outer page wash
export const T_SURFACE  = "#f8fafc";   // card / list surface (replaces white)
export const T_SURFACE2 = "#f1f5f9";   // headers, selects, inactive tabs, cancel buttons
export const T_CAL_BG   = "#eff6ff";   // calendar blue wash
export const T_CAL_BDR  = "#bfdbfe";   // calendar border
// Borders
export const T_BORDER   = "#e2e8f0";
export const T_BORDER_M = "#cbd5e1";
// Shadow
export const T_SHADOW   = "0 1px 4px rgba(0,0,0,0.08)";

export function asText(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.map((v) => (typeof v === "object" && v !== null && "plain_text" in v ? String((v as { plain_text: string }).plain_text) : String(v))).join("");
  return String(val);
}
