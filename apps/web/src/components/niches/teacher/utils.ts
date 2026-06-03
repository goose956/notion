export const ACCENT        = "#2563eb";
export const ACCENT_LIGHT  = "rgba(37,99,235,0.07)";
export const ACCENT_BORDER = "rgba(37,99,235,0.22)";
export const ACCENT_TEXT   = "#1e40af";

export function asText(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.map((v) => (typeof v === "object" && v !== null && "plain_text" in v ? String((v as { plain_text: string }).plain_text) : String(v))).join("");
  return String(val);
}
