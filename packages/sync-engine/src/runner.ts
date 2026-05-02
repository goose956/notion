import type { DataAdapter } from "@niche-factory/adapter-runtime";
import type { NotionApiClient } from "@niche-factory/notion-client";

/**
 * SyncResult — outcome of one adapter run.
 */
export interface SyncResult {
  adapterId: string;
  /** Notion DB id that rows were written into */
  notionDatabaseId: string;
  rowsProcessed: number;
  rowsSkipped: number;
  /** Milliseconds the sync took */
  durationMs: number;
  error?: string;
}

/**
 * SyncOptions — per-run configuration.
 */
export interface SyncOptions {
  /** Map of pack DB id → Notion DB id (from the deploy result) */
  databaseIds: Record<string, string>;
  /** Adapter-specific credentials keyed by credential name */
  credentials: Readonly<Record<string, string>>;
  /** Target pack DB id to write rows into */
  targetDatabaseId: string;
  /**
   * Cache of already-seen cache keys.
   * The caller manages this set between runs for deduplication.
   */
  seenKeys: Set<string>;
}

/**
 * runAdapter() — execute one adapter and write normalized rows to Notion.
 *
 * Flow:
 *  1. Stream raw items from adapter.fetch()
 *  2. Normalize each item with adapter.normalize()
 *  3. Deduplicate via adapter.cacheKey() + seenKeys set
 *  4. Write new rows to Notion as pages in the target database
 *
 * The caller is responsible for persisting seenKeys between runs.
 */
export async function runAdapter<RawType, Row>(
  adapter: DataAdapter<RawType, Row>,
  client: NotionApiClient,
  options: SyncOptions,
  criteria: Parameters<DataAdapter<RawType, Row>["fetch"]>[0],
): Promise<SyncResult> {
  const start = Date.now();
  const notionDatabaseId = options.databaseIds[options.targetDatabaseId];

  if (notionDatabaseId === undefined) {
    return {
      adapterId: adapter.id,
      notionDatabaseId: options.targetDatabaseId,
      rowsProcessed: 0,
      rowsSkipped: 0,
      durationMs: Date.now() - start,
      error: `Database id '${options.targetDatabaseId}' not found in databaseIds map`,
    };
  }

  let rowsProcessed = 0;
  let rowsSkipped = 0;
  let error: string | undefined;

  try {
    for await (const raw of adapter.fetch(criteria, options.credentials)) {
      const row = adapter.normalize(raw);
      const key = adapter.cacheKey(row);

      if (options.seenKeys.has(key)) {
        rowsSkipped++;
        continue;
      }

      options.seenKeys.add(key);

      // Write the row to Notion as a new page
      await writeRowToNotion(row, notionDatabaseId, client);
      rowsProcessed++;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return {
    adapterId: adapter.id,
    notionDatabaseId,
    rowsProcessed,
    rowsSkipped,
    durationMs: Date.now() - start,
    ...(error !== undefined ? { error } : {}),
  };
}

/**
 * writeRowToNotion() — write a normalized adapter row as a Notion page.
 *
 * Rows are plain objects. We map string values → rich_text, numbers → number,
 * booleans → checkbox, and use the first string field as the page title.
 */
async function writeRowToNotion(
  row: unknown,
  databaseId: string,
  client: NotionApiClient,
): Promise<void> {
  if (typeof row !== "object" || row === null) return;

  const entries = Object.entries(row as Record<string, unknown>);
  const properties: Record<string, unknown> = {};
  let titleSet = false;

  for (const [key, value] of entries) {
    if (typeof value === "string") {
      if (!titleSet) {
        properties[key] = {
          title: [{ type: "text", text: { content: value.slice(0, 2000) } }],
        };
        titleSet = true;
      } else {
        properties[key] = {
          rich_text: [{ type: "text", text: { content: value.slice(0, 2000) } }],
        };
      }
    } else if (typeof value === "number") {
      properties[key] = { number: value };
    } else if (typeof value === "boolean") {
      properties[key] = { checkbox: value };
    } else if (value instanceof Date) {
      properties[key] = { date: { start: value.toISOString() } };
    }
    // Skip arrays, objects — too complex to auto-map without schema knowledge
  }

  if (!titleSet) {
    // Notion requires at least one title property — add a fallback
    properties["Name"] = {
      title: [{ type: "text", text: { content: "Imported row" } }],
    };
  }

  await client.call((c) =>
    c.pages.create({
      parent: { database_id: databaseId },
      properties: properties as Parameters<typeof c.pages.create>[0]["properties"],
    }),
  );
}
