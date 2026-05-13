/**
 * web-search.ts — searches the internet via Serper.dev.
 *
 * API key: SERPER_API_KEY (set in admin Settings or environment variable)
 * Get a free key at https://serper.dev
 */
import type { Skill, SkillContext, JsonValue } from "../../src/types.js";

type SerperResult = {
  title?: string;
  link?: string;
  snippet?: string;
};

type SerperResponse = {
  organic?: SerperResult[];
  knowledgeGraph?: { title?: string; description?: string };
};

export const webSearchSkill: Skill = {
  name: "web_search",
  description:
    "Search the internet for current information. Returns titles, URLs, and snippets from Google organic results.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query string.",
      },
      num_results: {
        type: "number",
        description: "Number of results to return (default 5, max 10).",
      },
    },
    required: ["query"],
  },
  async handler(args: Record<string, JsonValue>, ctx: SkillContext): Promise<string> {
    const apiKey =
      ctx.apiKeys?.["SERPER_API_KEY"] ?? process.env["SERPER_API_KEY"];

    if (!apiKey) {
      return (
        "Error: SERPER_API_KEY is not configured. " +
        "Add it in Admin → Settings → Web Search API Key, or set the SERPER_API_KEY environment variable. " +
        "Get a free key at https://serper.dev"
      );
    }

    const query = typeof args["query"] === "string" ? args["query"] : String(args["query"] ?? "");
    if (!query.trim()) return "Error: query must be a non-empty string.";

    const numResults = Math.min(
      typeof args["num_results"] === "number" ? args["num_results"] : 5,
      10,
    );

    let data: SerperResponse;
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query, num: numResults }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        return `Search API error ${res.status}: ${res.statusText}`;
      }

      data = (await res.json()) as SerperResponse;
    } catch (err) {
      return `Error calling search API: ${err instanceof Error ? err.message : String(err)}`;
    }

    const parts: string[] = [];

    // Knowledge graph snippet if available
    if (data.knowledgeGraph?.title) {
      parts.push(`[Knowledge Graph] ${data.knowledgeGraph.title}: ${data.knowledgeGraph.description ?? ""}`);
    }

    // Organic results
    const organic = (data.organic ?? []).slice(0, numResults);
    if (organic.length === 0) return "No results found for that query.";

    for (const r of organic) {
      parts.push(`Title: ${r.title ?? "(no title)"}\nURL: ${r.link ?? ""}\nSnippet: ${r.snippet ?? ""}`);
    }

    return parts.join("\n\n");
  },
};
