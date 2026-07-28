/**
 * Runs an Apify Actor and returns dataset results.
 *
 * API key: APIFY_TOKEN (set in admin Settings or environment variable)
 */
import type { Skill, SkillContext, JsonValue } from "../../src/types.js";

const APIFY_BASE = "https://api.apify.com/v2";
const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_SECONDS = 60;
const DEFAULT_MAX_ITEMS = 10;
const MAX_ITEMS = 50;
const TERMINAL_STATUSES = new Set(["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"]);

type ApifyRun = {
  id?: string;
  status?: string;
  defaultDatasetId?: string;
};

type ApifyRunResponse = { data?: ApifyRun };

function authorizationHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function normalizeActorId(actorId: string): string | null {
  const value = actorId.trim();
  if (/^[A-Za-z0-9]+$/.test(value)) return value;

  const slug = /^([A-Za-z0-9._-]+)[/~]([A-Za-z0-9._-]+)$/.exec(value);
  return slug === null ? null : `${slug[1]}~${slug[2]}`;
}

function parseMaxItems(value: JsonValue | undefined): number | null {
  if (value === undefined) return DEFAULT_MAX_ITEMS;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_ITEMS
  ) {
    return null;
  }
  return value;
}

function parseMaxTotalChargeUsd(value: JsonValue | undefined): number | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

async function pollUntilFinished(
  runId: string,
  token: string,
): Promise<ApifyRun | null> {
  const deadline = Date.now() + MAX_POLL_SECONDS * 1_000;
  while (Date.now() < deadline) {
    const res = await fetch(`${APIFY_BASE}/actor-runs/${encodeURIComponent(runId)}`, {
      headers: authorizationHeaders(token),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as ApifyRunResponse;
    const run = data.data;
    if (run === undefined) {
      throw new Error("Apify did not return run data");
    }

    const status = run.status ?? "";
    if (TERMINAL_STATUSES.has(status)) {
      return run;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return null;
}

export const runApifySkill: Skill = {
  name: "run_apify",
  description:
    "Run any Apify actor (scraper) and wait for results. Returns up to max_items structured data items.",
  inputSchema: {
    type: "object",
    properties: {
      actor_id: {
        type: "string",
        description: 'Apify actor ID in format "username/actor-name" (e.g. "apify/google-search-scraper").',
      },
      input: {
        type: "object",
        description: "Actor input configuration (see the actor docs for options).",
      },
      max_items: {
        type: "number",
        description:
          "Maximum charged dataset items for supported Actors and result items to return (default 10, max 50).",
        minimum: 1,
        maximum: MAX_ITEMS,
      },
      max_total_charge_usd: {
        type: "number",
        description: "Maximum total Actor run charge in USD.",
        exclusiveMinimum: 0,
      },
    },
    required: ["actor_id", "input"],
  },
  async handler(args: Record<string, JsonValue>, ctx: SkillContext): Promise<string> {
    const token = ctx.apiKeys?.["APIFY_TOKEN"] ?? process.env["APIFY_TOKEN"];

    if (!token) {
      return (
        "Error: APIFY_TOKEN is not configured. " +
        "Add it in Admin → Settings → Apify Token, or set the APIFY_TOKEN environment variable. " +
        "Get a free token at https://apify.com"
      );
    }

    const actorId = typeof args["actor_id"] === "string" ? args["actor_id"].trim() : "";
    if (!actorId) return "Error: actor_id is required (e.g. \"apify/google-search-scraper\").";
    const apiActorId = normalizeActorId(actorId);
    if (apiActorId === null) {
      return "Error: actor_id must be an Actor ID or a username/actor-name slug.";
    }

    const rawInput = args["input"];
    if (
      rawInput === null ||
      typeof rawInput !== "object" ||
      Array.isArray(rawInput)
    ) {
      return "Error: input must be an object.";
    }
    const input = rawInput;

    const maxItems = parseMaxItems(args["max_items"]);
    if (maxItems === null) {
      return `Error: max_items must be a positive number no greater than ${MAX_ITEMS}.`;
    }

    const maxTotalChargeUsd = parseMaxTotalChargeUsd(args["max_total_charge_usd"]);
    if (maxTotalChargeUsd === null) {
      return "Error: max_total_charge_usd must be a positive number.";
    }

    // Start the actor run
    let startData: ApifyRunResponse;
    try {
      const startUrl = new URL(
        `${APIFY_BASE}/actors/${encodeURIComponent(apiActorId)}/runs`,
      );
      startUrl.searchParams.set("maxItems", String(maxItems));
      if (maxTotalChargeUsd !== undefined) {
        startUrl.searchParams.set("maxTotalChargeUsd", String(maxTotalChargeUsd));
      }

      const startRes = await fetch(startUrl, {
        method: "POST",
        headers: {
          ...authorizationHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(15_000),
      });

      if (!startRes.ok) {
        const text = await startRes.text();
        return `Failed to start Apify actor "${actorId}": HTTP ${startRes.status}: ${text.slice(0, 500)}`;
      }

      startData = (await startRes.json()) as ApifyRunResponse;
    } catch (err) {
      return `Error starting Apify actor: ${err instanceof Error ? err.message : String(err)}`;
    }

    const runId = startData.data?.id;
    if (!runId) return "Error: Apify did not return a run ID.";

    // Poll for completion
    let finishedRun: ApifyRun | null;
    try {
      finishedRun = await pollUntilFinished(runId, token);
    } catch (err) {
      return `Error checking Apify run: ${err instanceof Error ? err.message : String(err)}`;
    }
    if (finishedRun === null) {
      return `Actor run timed out after ${MAX_POLL_SECONDS}s. Run ID: ${runId}. Check Apify console for results.`;
    }

    if (finishedRun.status !== "SUCCEEDED") {
      return `Actor run ${finishedRun.status ?? "failed"}. Run ID: ${runId}`;
    }

    const datasetId = finishedRun.defaultDatasetId;
    if (!datasetId) return "Actor succeeded but no dataset was created.";

    // Fetch dataset items
    let items: JsonValue[];
    try {
      const datasetUrl = new URL(
        `${APIFY_BASE}/datasets/${encodeURIComponent(datasetId)}/items`,
      );
      datasetUrl.searchParams.set("limit", String(maxItems));
      const dsRes = await fetch(datasetUrl, {
        headers: authorizationHeaders(token),
        signal: AbortSignal.timeout(15_000),
      });

      if (!dsRes.ok) {
        return `Failed to fetch dataset results: HTTP ${dsRes.status}`;
      }

      // Apify returns a JSON array directly for /items
      const rawItems = (await dsRes.json()) as JsonValue;
      items = Array.isArray(rawItems) ? rawItems : [];
    } catch (err) {
      return `Error fetching dataset: ${err instanceof Error ? err.message : String(err)}`;
    }

    if (items.length === 0) return "Actor completed but returned no items.";

    return JSON.stringify(items, null, 2);
  },
};
