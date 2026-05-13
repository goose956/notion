/**
 * fetch-url.ts — fetches a public URL and returns its text content.
 *
 * No API key required.
 */
import type { Skill, SkillContext, JsonValue } from "../../src/types.js";

export const fetchUrlSkill: Skill = {
  name: "fetch_url",
  description:
    "Fetch and return the readable text content of a public URL. HTML tags are stripped. Content is capped at 5000 characters.",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The full URL to fetch (must start with http:// or https://).",
      },
    },
    required: ["url"],
  },
  async handler(args: Record<string, JsonValue>, _ctx: SkillContext): Promise<string> {
    const url = typeof args["url"] === "string" ? args["url"] : String(args["url"] ?? "");
    if (!url.trim()) return "Error: url must be a non-empty string.";

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return "Error: url must start with http:// or https://";
    }

    let text: string;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "NicheFactory-Agent/1.0 (compatible; research bot)",
          Accept: "text/html,application/xhtml+xml,application/json,text/plain",
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        return `Failed to fetch ${url}: HTTP ${res.status} ${res.statusText}`;
      }

      const contentType = res.headers.get("content-type") ?? "";
      text = await res.text();

      if (contentType.includes("application/json")) {
        // Return JSON directly (already text)
        return text.slice(0, 5000);
      }

      // Strip HTML: remove script/style blocks, then all tags
      text = text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();
    } catch (err) {
      return `Error fetching URL: ${err instanceof Error ? err.message : String(err)}`;
    }

    const truncated = text.length > 5000;
    return text.slice(0, 5000) + (truncated ? "\n\n...[content truncated at 5000 chars]" : "");
  },
};
