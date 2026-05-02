import type { DataAdapter, CustomerCriteria } from "../interface.js";
import { XMLParser } from "fast-xml-parser";

export interface RssItem {
  title: string;
  link: string;
  pubDate: string | undefined;
  description: string | undefined;
  /** Raw XML element map for adapter-specific field extraction */
  raw: Record<string, string>;
}

export interface RssAdapterCriteria extends CustomerCriteria {
  /** One or more RSS feed URLs to fetch */
  feedUrls: string[];
}

/**
 * RssAdapter — abstract base class for any RSS-based data source.
 *
 * Concrete adapters extend this class and implement `normalize()` and
 * `cacheKey()` for their specific data shape. The base `fetch()` handles
 * HTTP retrieval and XML parsing.
 *
 * Usage:
 *   class ZillowRssAdapter extends RssAdapter<ZillowListing> {
 *     readonly id = 'zillow-rss';
 *     readonly niche = 'real-estate-investor';
 *     ...
 *   }
 */
export abstract class RssAdapter<Row = unknown, Criteria extends RssAdapterCriteria = RssAdapterCriteria>
  implements DataAdapter<RssItem, Row, Criteria>
{
  abstract readonly id: string;
  abstract readonly niche: string;
  abstract readonly description: string;
  abstract readonly requiredCredentials: readonly string[];

  /** Stored during fetch() so normalize() can access criteria. */
  protected currentCriteria: Criteria = { feedUrls: [] } as unknown as Criteria;

  async *fetch(
    criteria: Criteria,
    _credentials: Readonly<Record<string, string>>,
  ): AsyncIterable<RssItem> {
    this.currentCriteria = criteria;
    for (const url of criteria.feedUrls) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`RSS fetch failed for ${url}: HTTP ${response.status}`);
      }
      const xml = await response.text();
      yield* this.parseRss(xml);
    }
  }

  abstract normalize(raw: RssItem): Row;
  abstract cacheKey(row: Row): string;

  /**
   * RSS 2.0 / Atom parser using fast-xml-parser.
   * Handles CDATA, namespaced elements, and both RSS 2.0 and Atom formats.
   */
  private *parseRss(xml: string): Iterable<RssItem> {
    const parser = new XMLParser({
      ignoreAttributes: false,
      cdataPropName: "__cdata",
      isArray: (name) => name === "item" || name === "entry",
    });
    const doc = parser.parse(xml) as Record<string, unknown>;

    // Support RSS 2.0 (rss.channel.item) and Atom (feed.entry)
    const channel = (doc["rss"] as Record<string, unknown> | undefined)?.["channel"] as Record<string, unknown> | undefined;
    const items: unknown[] = (channel?.["item"] as unknown[] | undefined)
      ?? (doc["feed"] as Record<string, unknown> | undefined)?.["entry"] as unknown[]
      ?? [];

    for (const item of items) {
      const i = item as Record<string, unknown>;
      const title = extractField(i, "title");
      const link = extractField(i, "link") || extractAtomLink(i);
      if (!title && !link) continue;
      yield {
        title,
        link,
        pubDate: extractField(i, "pubDate") || extractField(i, "updated") || undefined,
        description: extractField(i, "description") || extractField(i, "summary") || undefined,
        raw: Object.fromEntries(
          Object.entries(i).map(([k, v]) => [k, String(v ?? "")]),
        ),
      };
    }
  }
}

function extractField(item: Record<string, unknown>, key: string): string {
  const val = item[key];
  if (val === undefined || val === null) return "";
  if (typeof val === "string") return val.trim();
  // fast-xml-parser CDATA wrapper
  const cdata = (val as Record<string, unknown>)["__cdata"];
  if (typeof cdata === "string") return cdata.trim();
  return String(val).trim();
}

function extractAtomLink(item: Record<string, unknown>): string {
  // Atom <link href="..."/> is parsed as { "@_href": "...", "@_rel": "alternate" }
  const link = item["link"];
  if (!link || typeof link !== "object") return "";
  return (link as Record<string, string>)["@_href"] ?? "";
}
