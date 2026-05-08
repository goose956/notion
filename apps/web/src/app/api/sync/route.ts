import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdapter } from "@niche-factory/adapter-runtime";
import { runAdapter } from "@niche-factory/sync-engine";
import { NotionApiClient } from "@niche-factory/notion-client";
import { getUserCriteria } from "@niche-factory/db";
import { auth } from "@/auth";
import "@/lib/load-adapters";

const SyncRequestSchema = z.object({
  /** The niche pack id (e.g. 'real-estate-investor') */
  nicheId: z.string().min(1),
  /** The adapter to run (e.g. 'zillow-rss') */
  adapterId: z.string().min(1),
  /** Map of pack DB id → Notion DB id (from the deploy result) */
  databaseIds: z.record(z.string(), z.string()),
  /** Target pack DB id to write rows into */
  targetDatabaseId: z.string().min(1),
  /** Adapter-specific fetch criteria (adapter-defined shape) */
  criteria: z.record(z.string(), z.unknown()).optional(),
  /** Adapter credentials — treated as opaque strings */
  credentials: z.record(z.string(), z.string()).optional(),
});

/**
 * POST /api/sync — run a data adapter and write rows to Notion.
 *
 * Uses the user's Notion OAuth token from the session, falling back to
 * NOTION_TOKEN env var for server-level token.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  const notionToken =
    (session as typeof session & { notionToken?: string })?.notionToken ??
    process.env["NOTION_TOKEN"];

  if (!notionToken) {
    return NextResponse.json(
      { error: "No Notion token available — sign in with Notion first" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = SyncRequestSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: input.error.issues },
      { status: 422 },
    );
  }

  const adapter = getAdapter(input.data.nicheId, input.data.adapterId);
  if (adapter === undefined) {
    return NextResponse.json(
      {
        error: `Adapter '${input.data.nicheId}:${input.data.adapterId}' not registered. Make sure you import and register it before calling this endpoint.`,
      },
      { status: 404 },
    );
  }

  const client = new NotionApiClient({ auth: notionToken });

  // Load saved criteria from DB if not supplied in the request body
  const notionUserId = (session as Record<string, unknown> | null)?.["notionUserId"];
  let criteria = input.data.criteria ?? {};
  if (Object.keys(criteria).length === 0 && typeof notionUserId === "string") {
    const saved = await getUserCriteria(notionUserId, input.data.nicheId);
    if (saved !== undefined) {
      criteria = saved.criteria as Record<string, unknown>;
    }
  }

  const resolvedCriteria = resolveAdapterCriteria(input.data.adapterId, criteria);

  const seenKeys = new Set<string>();
  const result = await runAdapter(adapter, client, {
    databaseIds: input.data.databaseIds,
    credentials: input.data.credentials ?? {},
    targetDatabaseId: input.data.targetDatabaseId,
    seenKeys,
  }, resolvedCriteria);

  const status = result.error !== undefined ? 502 : 200;
  return NextResponse.json({ result }, { status });
}

function resolveAdapterCriteria(
  adapterId: string,
  criteria: Record<string, unknown>,
): Record<string, unknown> {
  const markets = parseList(criteria["target-markets"]);
  const country = toSafeString(criteria["market-country"]);
  const minPrice = toOptionalNumber(criteria["min-purchase-price"]);
  const maxPrice = toOptionalNumber(criteria["max-purchase-price"]);

  const sharedFeedUrls = parseList(criteria["listing-feed-urls"]);
  const zillowFeedUrls = parseList(criteria["zillow-feed-urls"]);
  const redfinFeedUrls = parseList(criteria["redfin-feed-urls"]);
  const ukFeedUrls = parseList(criteria["uk-feed-urls"]);

  const defaultZillow = parseList(process.env["ZILLOW_RSS_FEED_URLS"]);
  const defaultRedfin = parseList(process.env["REDFIN_RSS_FEED_URLS"]);
  const defaultGlobal = parseList(process.env["GLOBAL_RSS_FEED_URLS"]);

  if (adapterId === "zillow-rss") {
    return {
      feedUrls: firstNonEmpty(defaultZillow, zillowFeedUrls, sharedFeedUrls),
      market: markets[0] ?? "US Market",
      markets,
      country,
      minPrice,
      maxPrice,
    };
  }

  if (adapterId === "redfin-rss") {
    return {
      feedUrls: firstNonEmpty(defaultRedfin, redfinFeedUrls, sharedFeedUrls),
      market: markets[0] ?? "US Market",
      markets,
      country,
      minPrice,
      maxPrice,
    };
  }

  if (adapterId === "global-rss") {
    return {
      feedUrls: firstNonEmpty(defaultGlobal, ukFeedUrls, sharedFeedUrls),
      market: markets[0] ?? "Global Market",
      markets,
      country,
      minPrice,
      maxPrice,
    };
  }

  if (adapterId === "propstream") {
    return {
      markets,
      distressTypes: ["pre_foreclosure", "tax_delinquent"],
      maxPrice,
    };
  }

  if (adapterId === "apify-google-places") {
    const keywords = parseList(criteria["lead-keywords"]);
    const locations = parseList(criteria["target-locations"]);
    const minRating = toOptionalNumber(criteria["min-rating"]);
    const minReviews = toOptionalNumber(criteria["min-reviews"]);
    const maxResults = toOptionalNumber(criteria["max-results"]);
    const country = toSafeString(criteria["country-filter"]) ?? "Any";

    return {
      keywords,
      locations,
      minRating,
      minReviews,
      maxResults,
      country,
      actorId: process.env["APIFY_GOOGLE_PLACES_ACTOR_ID"],
    };
  }

  return criteria;
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v).trim())
      .filter((v) => v.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }
  return [];
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function toSafeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function firstNonEmpty(...lists: string[][]): string[] {
  for (const list of lists) {
    if (list.length > 0) return list;
  }
  return [];
}
