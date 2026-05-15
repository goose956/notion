/**
 * Vendor Web Search Adapter — Wedding Planner niche
 * Adapter interface version: 1
 *
 * Uses the web_search tool (Serper.dev) to find local wedding vendors by
 * category and location. Returns structured vendor rows saved to the
 * Vendors database.
 *
 * This adapter is invoked on-demand from the research chatbot when the
 * bride asks to find vendors in her area.
 */

import {
  registerAdapter,
  type DataAdapter,
} from "@niche-factory/adapter-runtime";

// ─── Domain types ──────────────────────────────────────────────────────────

export interface VendorSearchRaw {
  title: string;
  link: string;
  snippet: string;
  displayLink?: string;
}

export interface VendorRow {
  "Vendor Name": string;
  "Category": string;
  "Status": string;
  "Website": string;
  "Location": string;
  "Notes": string;
  "Added": string;
  "Source": string;
}

export interface VendorSearchCriteria {
  [key: string]: unknown;
  /** Vendor category to search for e.g. 'florist', 'wedding photographer' */
  category: string;
  /** Location to search in e.g. 'Bristol', 'Cotswolds' */
  location: string;
  /** Max number of results to return (default: 10) */
  maxResults?: number;
}

// ─── Adapter ───────────────────────────────────────────────────────────────

class VendorWebSearchAdapter
  implements DataAdapter<VendorSearchRaw, VendorRow, VendorSearchCriteria>
{
  readonly id = "vendor-web-search" as const;
  readonly niche = "wedding-planner" as const;
  readonly description =
    "Finds local wedding vendors using web search, by category and location.";
  readonly requiredCredentials: readonly string[] = [];

  async *fetch(
    criteria: VendorSearchCriteria,
    credentials: Readonly<Record<string, string>>,
  ): AsyncIterable<VendorSearchRaw> {
    const serperKey =
      credentials["SERPER_API_KEY"] ?? process.env["SERPER_API_KEY"];
    if (!serperKey) {
      throw new Error(
        "SERPER_API_KEY is required to run the vendor-web-search adapter",
      );
    }

    const query = `${criteria.category} wedding ${criteria.location}`;
    const maxResults = Math.min(criteria.maxResults ?? 10, 20);

    console.info("[vendor-web-search] fetch:start", { query, maxResults });

    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": serperKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: maxResults }),
    });

    if (!res.ok) {
      throw new Error(
        `Serper API error ${res.status}: ${await res.text()}`,
      );
    }

    const data = (await res.json()) as {
      organic?: VendorSearchRaw[];
    };

    const results = data.organic ?? [];
    console.info("[vendor-web-search] fetch:results", { count: results.length });

    for (const item of results.slice(0, maxResults)) {
      yield item;
    }
  }

  normalize(raw: VendorSearchRaw, criteria: VendorSearchCriteria): VendorRow {
    // Extract a clean vendor name from the page title — strip common suffixes
    const name = raw.title
      .replace(/\s*[-|–]\s*.+$/, "")
      .replace(/\s*\|.+$/, "")
      .trim();

    return {
      "Vendor Name": name || (raw.displayLink ?? raw.title),
      "Category": toNotionCategory(criteria.category),
      "Status": "Shortlisted",
      "Website": raw.link,
      "Location": criteria.location,
      "Notes": raw.snippet,
      "Added": new Date().toISOString(),
      "Source": "AI Vendor Search",
    };
  }

  cacheKey(row: VendorRow): string {
    return row["Website"];
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Map freeform search category to the schema's select options */
function toNotionCategory(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes("florist") || lower.includes("flower")) return "Florist";
  if (lower.includes("venue") || lower.includes("castle") || lower.includes("barn")) return "Venue";
  if (lower.includes("cater")) return "Catering";
  if (lower.includes("photo")) return "Photography";
  if (lower.includes("video")) return "Videography";
  if (lower.includes("music") || lower.includes("dj") || lower.includes("band")) return "Music / DJ";
  if (lower.includes("cake") || lower.includes("baker")) return "Cake";
  if (lower.includes("hair") || lower.includes("makeup") || lower.includes("beauty")) return "Hair & Makeup";
  if (lower.includes("dress") || lower.includes("attire") || lower.includes("suit")) return "Dress / Attire";
  if (lower.includes("transport") || lower.includes("car") || lower.includes("limo")) return "Transport";
  if (lower.includes("stationary") || lower.includes("invite") || lower.includes("invitation")) return "Stationery";
  if (lower.includes("officiant") || lower.includes("celebrant")) return "Officiant";
  return "Other";
}

// ─── Registration ──────────────────────────────────────────────────────────

registerAdapter(new VendorWebSearchAdapter());
