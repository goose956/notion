import {
  RssAdapter,
  registerAdapter,
  type RssItem,
  type RssAdapterCriteria,
} from "@niche-factory/adapter-runtime";
import type { Listing } from "./zillow-rss.js";

export interface GlobalRssCriteria extends RssAdapterCriteria {
  market: string;
  markets?: string[];
  country?: string;
  minPrice?: number;
  maxPrice?: number;
}

export class GlobalRssAdapter extends RssAdapter<Listing, GlobalRssCriteria> {
  readonly id = "global-rss" as const;
  readonly niche = "real-estate-investor" as const;
  readonly description =
    "Fetches listings from user-provided RSS feeds for US, UK, and other markets.";
  readonly requiredCredentials: readonly string[] = [];

  override async *fetch(
    criteria: GlobalRssCriteria,
    credentials: Readonly<Record<string, string>>,
  ): AsyncIterable<RssItem> {
    const feedUrls = criteria.feedUrls
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (feedUrls.length === 0) {
      throw new Error(
        "No global feed URLs configured. Ask your workspace admin to set GLOBAL_RSS_FEED_URLS.",
      );
    }

    for await (const item of super.fetch({ ...criteria, feedUrls }, credentials)) {
      if (!matchesCountry(item, criteria.country)) continue;
      if (!matchesMarkets(item, criteria.markets)) continue;
      if (!matchesPriceRange(parsePrice(item), criteria.minPrice, criteria.maxPrice)) continue;
      yield item;
    }
  }

  override normalize(raw: RssItem): Listing {
    const market = inferMarket(raw, this.currentCriteria.markets, this.currentCriteria.market);
    return {
      address: cleanTitle(raw.title),
      listingUrl: raw.link,
      askingPrice: parsePrice(raw),
      beds: parseNumber(`${raw.title} ${raw.description ?? ""}`, /(\d+)\s*(?:bed|bd)/i),
      baths: parseNumber(`${raw.title} ${raw.description ?? ""}`, /(\d+)\s*(?:bath|ba)/i),
      sqft: parseNumber(`${raw.title} ${raw.description ?? ""}`, /(\d[\d,]+)\s*(?:sq\s*ft|sqft)/i),
      market,
      leadDate: raw.pubDate ?? new Date().toISOString(),
    };
  }

  override cacheKey(row: Listing): string {
    return `global-rss:${row.listingUrl}`;
  }
}

function cleanTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim();
}

function parsePrice(raw: RssItem): number | undefined {
  return parseCurrency(`${raw.title} ${raw.description ?? ""}`);
}

function parseCurrency(text: string): number | undefined {
  const m = /(?:\$|GBP\s*|EUR\s*|USD\s*)(\d[\d,]+)/i.exec(text);
  if (!m?.[1]) return undefined;
  return parseInt(m[1].replace(/,/g, ""), 10);
}

function parseNumber(text: string, pattern: RegExp): number | undefined {
  const m = pattern.exec(text);
  if (!m?.[1]) return undefined;
  return parseInt(m[1].replace(/,/g, ""), 10);
}

function inferMarket(raw: RssItem, markets: string[] | undefined, fallback: string): string {
  const haystack = `${raw.title} ${raw.description ?? ""}`.toLowerCase();
  const match = (markets ?? [])
    .find((m) => m.trim().length > 0 && haystack.includes(m.trim().toLowerCase()));
  return match ?? fallback;
}

function matchesCountry(raw: RssItem, country: string | undefined): boolean {
  if (country === undefined || country.toLowerCase() === "both") return true;
  const haystack = `${raw.title} ${raw.description ?? ""}`.toLowerCase();
  const normalized = country.toLowerCase();
  if (normalized === "us") {
    return /\b(usa|united states|,\s*[a-z]{2}\b)\b/i.test(haystack);
  }
  if (normalized === "uk") {
    return /\b(uk|united kingdom|england|scotland|wales|london)\b/i.test(haystack);
  }
  return true;
}

function matchesMarkets(raw: RssItem, markets: string[] | undefined): boolean {
  if (markets === undefined || markets.length === 0) return true;
  const haystack = `${raw.title} ${raw.description ?? ""}`.toLowerCase();
  return markets.some((m) => m.trim().length > 0 && haystack.includes(m.trim().toLowerCase()));
}

function matchesPriceRange(
  price: number | undefined,
  minPrice: number | undefined,
  maxPrice: number | undefined,
): boolean {
  if (price === undefined) return true;
  if (minPrice !== undefined && price < minPrice) return false;
  if (maxPrice !== undefined && price > maxPrice) return false;
  return true;
}

registerAdapter(new GlobalRssAdapter());
