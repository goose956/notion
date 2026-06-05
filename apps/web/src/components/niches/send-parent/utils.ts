/**
 * Compute a child's age in years from a ISO date string (YYYY-MM-DD).
 * Returns null if the value isn't a valid date.
 */
export function ageFromDob(dob: string): number | null {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

/**
 * Resolve a human-readable age label from whatever is stored in criteria.
 * Handles both the new DOB format ("YYYY-MM-DD") and the legacy age-band
 * strings ("Under 5", "5–7", etc.) so existing users aren't broken.
 */
export function resolveChildAge(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return "";
  // New format: ISO date
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const years = ageFromDob(s);
    if (years === null) return "";
    if (years === 1) return "1 year old";
    return `${years} years old`;
  }
  // Legacy: return the stored band as-is
  return s;
}

export const ACCENT        = "#8b5cf6";
export const ACCENT_LIGHT  = "rgba(139,92,246,0.07)";
export const ACCENT_BORDER = "rgba(139,92,246,0.25)";
export const ACCENT_TEXT   = "#6d28d9";

export function asText(val: unknown): string {
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.map(asText).join("");
  if (val && typeof val === "object") {
    const o = val as Record<string, unknown>;
    if (typeof o["plain_text"] === "string") return o["plain_text"];
    if (Array.isArray(o["rich_text"]))        return asText(o["rich_text"]);
    if (typeof o["name"] === "string")        return o["name"];
    if (typeof o["select"] === "object")      return asText(o["select"]);
  }
  return "";
}

export function asNumber(val: unknown): number | null {
  if (typeof val === "number") return val;
  if (val && typeof val === "object") {
    const o = val as Record<string, unknown>;
    if (typeof o["number"] === "number") return o["number"];
  }
  return null;
}
