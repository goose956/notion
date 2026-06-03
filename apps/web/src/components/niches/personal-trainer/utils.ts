export const ACCENT        = "#16a34a";
export const ACCENT_LIGHT  = "rgba(22,163,74,0.07)";
export const ACCENT_BORDER = "rgba(22,163,74,0.25)";
export const ACCENT_TEXT   = "#15803d";

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
