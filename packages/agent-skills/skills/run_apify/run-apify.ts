/**
 * run-apify.ts — runs an Apify actor and returns dataset results.
 *
 * API key: APIFY_TOKEN (set in admin Settings or environment variable)
 * Get a free token at https://apify.com
 */
import type { Skill, SkillContext, JsonValue } from "../../src/types.js";

const APIFY_BASE = "https://api.apify.com/v2";
const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_SECONDS = 60;

type ApifyRun = {
  id?: string;
  status?: string;
  defaultDatasetId?: string;
};

type ApifyRunResponse = { data?: ApifyRun };
type ApifyDatasetResponse = { data?: { items?: JsonValue[] } };

async function pollUntilFinished(
  runId: string,
  token: string,
): Promise<ApifyRun | null> {
  const deadline = Date.now() + MAX_POLL_SECONDS * 1_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as ApifyRunResponse;
    const run = data.data;
    if (run === undefined) return null;

    const status = run.status ?? "";
    if (["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
      return run;
    }
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
        description: "Maximum result items to return (default 10, max 50).",
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

    const input = args["input"] !== null && typeof args["input"] === "object" && !Array.isArray(args["input"])
      ? args["input"]
      : {};

    const maxItems = Math.min(
      typeof args["max_items"] === "number" ? args["max_items"] : 10,
      50,
    );

    // Start the actor run
    let startData: ApifyRunResponse;
    try {
      const startRes = await fetch(
        `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: AbortSignal.timeout(15_000),
        },
      );

      if (!startRes.ok) {
        const text = await startRes.text();
        return `Failed to start Apify actor "${actorId}": HTTP ${startRes.status} — ${text.slice(0, 500)}`;
      }

      startData = (await startRes.json()) as ApifyRunResponse;
    } catch (err) {
      return `Error starting Apify actor: ${err instanceof Error ? err.message : String(err)}`;
    }

    const runId = startData.data?.id;
    if (!runId) return "Error: Apify did not return a run ID.";

    // Poll for completion
    const finishedRun = await pollUntilFinished(runId, token);
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
      const dsRes = await fetch(
        `${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&limit=${maxItems}`,
        { signal: AbortSignal.timeout(15_000) },
      );

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
