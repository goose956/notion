import {
  registerAdapter,
  type DataAdapter,
} from "@niche-factory/adapter-runtime";

interface GooglePlaceRaw {
  placeId?: string;
  title?: string;
  name?: string;
  categoryName?: string;
  address?: string;
  city?: string;
  countryCode?: string;
  phone?: string;
  website?: string;
  url?: string;
  totalScore?: number;
  rating?: number;
  reviewsCount?: number;
  totalReviews?: number;
}

interface LeadRow {
  "Business Name": string;
  "Primary Category": string;
  "Website": string;
  "Phone": string;
  "Address": string;
  "City": string;
  "Country": string;
  "Rating": number;
  "Reviews": number;
  "Google Maps URL": string;
  "Google Place ID": string;
  "Status": string;
  "Imported At": string;
  "Source": string;
  "Notes": string;
}

interface ApifyGooglePlacesCriteria {
  [key: string]: unknown;
  keywords: string[];
  locations: string[];
  maxResults?: number;
  minRating?: number;
  minReviews?: number;
  country?: string;
  actorId?: string;
}

class ApifyGooglePlacesAdapter
  implements DataAdapter<GooglePlaceRaw, LeadRow, ApifyGooglePlacesCriteria>
{
  readonly id = "apify-google-places" as const;
  readonly niche = "local-business-lead-tracker" as const;
  readonly description =
    "Collects local business leads from Google Maps via an Apify actor.";
  readonly requiredCredentials: readonly string[] = [];

  async *fetch(
    criteria: ApifyGooglePlacesCriteria,
    credentials: Readonly<Record<string, string>>,
  ): AsyncIterable<GooglePlaceRaw> {
    console.info("[apify-google-places] fetch:start", {
      criteria,
    });

    const token = credentials["APIFY_TOKEN"] ?? process.env["APIFY_TOKEN"];
    if (token === undefined || token.trim().length === 0) {
      throw new Error("APIFY_TOKEN is required to run apify-google-places adapter");
    }

    const actorId =
      criteria.actorId
      ?? process.env["APIFY_GOOGLE_PLACES_ACTOR_ID"]
      ?? "2Mdma1N6Fd0y3QEjR";

    const keywords = criteria.keywords.filter((k) => k.trim().length > 0);
    const locations = criteria.locations.filter((l) => l.trim().length > 0);
    if (keywords.length === 0 || locations.length === 0) {
      throw new Error("keywords and locations are required for Apify Google Places sync");
    }

    const searchStringsArray: string[] = [];
    for (const keyword of keywords) {
      for (const location of locations) {
        searchStringsArray.push(`${keyword} in ${location}`);
      }
    }

    const maxResults =
      typeof criteria.maxResults === "number" && Number.isFinite(criteria.maxResults)
        ? Math.max(1, Math.min(500, Math.floor(criteria.maxResults)))
        : 100;

    console.info("[apify-google-places] fetch:request", {
      actorId,
      searchStringsArray,
      maxResults,
      country: criteria.country ?? "Any",
      minRating: criteria.minRating,
      minReviews: criteria.minReviews,
    });

    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchStringsArray,
          maxCrawledPlacesPerSearch: maxResults,
          language: "en",
        }),
      },
    );

    if (!runResponse.ok) {
      const body = await runResponse.text();
      throw new Error(`Apify run failed: HTTP ${runResponse.status} ${body}`);
    }

    const runJson = await runResponse.json() as {
      data?: { id?: string; defaultDatasetId?: string; status?: string };
    };

    const runId = runJson.data?.id;
    if (runId === undefined || runId.length === 0) {
      throw new Error("Apify run did not return run id");
    }

    console.info("[apify-google-places] run:created", {
      runId,
      initialStatus: runJson.data?.status,
    });

    const finalRun = await waitForRunCompletion(runId, token);
    const datasetId = finalRun.defaultDatasetId;
    if (datasetId === undefined || datasetId.length === 0) {
      throw new Error("Apify run did not return defaultDatasetId");
    }

    console.info("[apify-google-places] run:completed", {
      runId,
      finalStatus: finalRun.status,
      datasetId,
    });

    const itemsResponse = await fetch(
      `https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?token=${encodeURIComponent(token)}&clean=true&format=json`,
    );

    if (!itemsResponse.ok) {
      const body = await itemsResponse.text();
      throw new Error(`Apify dataset fetch failed: HTTP ${itemsResponse.status} ${body}`);
    }

    const items = await itemsResponse.json() as unknown[];
    let yielded = 0;
    let filtered = 0;
    const filterReasons: Record<string, number> = {};

    for (const item of items) {
      const raw = item as GooglePlaceRaw;
      const filter = evaluateFilters(raw, criteria);
      if (!filter.ok) {
        filtered++;
        const reason = filter.reason ?? "unknown";
        filterReasons[reason] = (filterReasons[reason] ?? 0) + 1;
        continue;
      }
      yielded++;
      yield raw;
    }

    console.info("[apify-google-places] fetch:summary", {
      totalFetched: items.length,
      yielded,
      filtered,
      filterReasons,
    });
  }

  normalize(raw: GooglePlaceRaw): LeadRow {
    const rating = toNumber(raw.totalScore) ?? toNumber(raw.rating) ?? 0;
    const reviews = toNumber(raw.reviewsCount) ?? toNumber(raw.totalReviews) ?? 0;

    const businessName =
      toStringSafe(raw.title)
      || toStringSafe(raw.name)
      || "Unknown Business";

    const address = toStringSafe(raw.address);
    const city = toStringSafe(raw.city) || inferCity(address);
    const country = countryName(raw.countryCode, address);

    return {
      "Business Name": businessName,
      "Primary Category": toStringSafe(raw.categoryName),
      "Website": toStringSafe(raw.website),
      "Phone": toStringSafe(raw.phone),
      "Address": address,
      "City": city,
      "Country": country,
      "Rating": rating,
      "Reviews": reviews,
      "Google Maps URL": toStringSafe(raw.url),
      "Google Place ID": toStringSafe(raw.placeId),
      "Status": "Not started",
      "Imported At": new Date().toISOString(),
      "Source": "Apify Google Places",
      "Notes": "",
    };
  }

  cacheKey(row: LeadRow): string {
    const placeId = row["Google Place ID"].trim();
    if (placeId.length > 0) return `apify-google-places:${placeId}`;

    const url = row["Google Maps URL"].trim();
    if (url.length > 0) return `apify-google-places:${url}`;

    return `apify-google-places:${row["Business Name"]}:${row["Address"]}`;
  }
}

type ApifyRunInfo = {
  status?: string;
  defaultDatasetId?: string;
};

async function waitForRunCompletion(runId: string, token: string): Promise<ApifyRunInfo> {
  const maxAttempts = 60;
  const pollIntervalMs = 3_000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const runStatusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${encodeURIComponent(runId)}?token=${encodeURIComponent(token)}`,
    );

    if (!runStatusResponse.ok) {
      const body = await runStatusResponse.text();
      throw new Error(`Apify run status failed: HTTP ${runStatusResponse.status} ${body}`);
    }

    const runStatusJson = await runStatusResponse.json() as { data?: ApifyRunInfo };
    const run = runStatusJson.data ?? {};
    const status = run.status ?? "UNKNOWN";

    if (attempt === 0 || attempt % 5 === 0 || status === "SUCCEEDED") {
      console.info("[apify-google-places] run:poll", {
        runId,
        attempt: attempt + 1,
        status,
      });
    }

    if (status === "SUCCEEDED") {
      return run;
    }

    if (status === "FAILED" || status === "TIMED-OUT" || status === "ABORTED") {
      throw new Error(`Apify actor run did not succeed (status: ${status})`);
    }

    await delay(pollIntervalMs);
  }

  throw new Error("Apify actor run did not finish within timeout");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function evaluateFilters(
  raw: GooglePlaceRaw,
  criteria: ApifyGooglePlacesCriteria,
): { ok: boolean; reason?: string } {
  const rating = toNumber(raw.totalScore) ?? toNumber(raw.rating);
  const reviews = toNumber(raw.reviewsCount) ?? toNumber(raw.totalReviews);

  if (criteria.minRating !== undefined && rating !== undefined && rating < criteria.minRating) {
    return { ok: false, reason: "below-min-rating" };
  }

  if (criteria.minReviews !== undefined && reviews !== undefined && reviews < criteria.minReviews) {
    return { ok: false, reason: "below-min-reviews" };
  }

  const country = (criteria.country ?? "Any").toUpperCase();
  if (country !== "ANY") {
    const code = toStringSafe(raw.countryCode).toUpperCase();
    const acceptedCodes = country === "UK" ? new Set(["UK", "GB", "GBR"]) : new Set([country]);

    if (code.length > 0 && !acceptedCodes.has(code)) {
      return { ok: false, reason: `country-code-mismatch:${code}` };
    }

    if (code.length === 0 && country === "US") {
      const address = toStringSafe(raw.address).toLowerCase();
      if (!address.includes("usa") && !address.includes("united states")) {
        return { ok: false, reason: "country-address-mismatch:US" };
      }
    }
  }

  return { ok: true };
}

function inferCity(address: string): string {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length < 2) return "";
  return parts[parts.length - 2] ?? "";
}

function countryName(countryCode: string | undefined, address: string): string {
  const code = toStringSafe(countryCode).toUpperCase();
  if (code === "US") return "US";
  if (code === "UK" || code === "GB") return "UK";

  const lower = address.toLowerCase();
  if (lower.includes("united states") || lower.includes(" usa")) return "US";
  if (lower.includes("united kingdom") || lower.includes(" uk")) return "UK";
  return code;
}

function toStringSafe(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

registerAdapter(new ApifyGooglePlacesAdapter());
