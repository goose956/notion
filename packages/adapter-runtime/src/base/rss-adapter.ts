import type { DataAdapter, CustomerCriteria } from "../interface.js";

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
export abstract class RssAdapter<Row = unknown>
  implements DataAdapter<RssItem, Row, RssAdapterCriteria>
{
  abstract readonly id: string;
  abstract readonly niche: string;
  abstract readonly description: string;
  abstract readonly requiredCredentials: readonly string[];

  async *fetch(
    criteria: RssAdapterCriteria,
    _credentials: Readonly<Record<string, string>>,
  ): AsyncIterable<RssItem> {
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
   * Minimal RSS 2.0 / Atom parser.
   * For production, replace with a proper XML parser package.
   */
  private *parseRss(xml: string): Iterable<RssItem> {
    // Minimal regex-based extraction for stub purposes.
    // TODO(v0.2): Replace with fast-xml-parser or similar.
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1] ?? "";
      yield {
        title: extractTag(block, "title"),
        link: extractTag(block, "link"),
        pubDate: extractTagOptional(block, "pubDate"),
        description: extractTagOptional(block, "description"),
        raw: {},
      };
    }
  }
}

function extractTag(xml: string, tag: string): string {
  const m = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(xml);
  return m?.[1] ?? m?.[2] ?? "";
}

function extractTagOptional(xml: string, tag: string): string | undefined {
  const val = extractTag(xml, tag);
  return val.length > 0 ? val : undefined;
}
