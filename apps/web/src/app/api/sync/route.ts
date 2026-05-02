import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdapter } from "@niche-factory/adapter-runtime";
import { runAdapter } from "@niche-factory/sync-engine";
import { NotionApiClient } from "@niche-factory/notion-client";
import { auth } from "@/auth";

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

  const seenKeys = new Set<string>();
  const result = await runAdapter(adapter, client, {
    databaseIds: input.data.databaseIds,
    credentials: input.data.credentials ?? {},
    targetDatabaseId: input.data.targetDatabaseId,
    seenKeys,
  }, input.data.criteria ?? {});

  const status = result.error !== undefined ? 502 : 200;
  return NextResponse.json({ result }, { status });
}
