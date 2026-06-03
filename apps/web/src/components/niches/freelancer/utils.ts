export const ACCENT        = "#4f46e5";
export const ACCENT_LIGHT  = "rgba(79,70,229,0.07)";
export const ACCENT_BORDER = "rgba(79,70,229,0.25)";
export const ACCENT_TEXT   = "#3730a3";

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
