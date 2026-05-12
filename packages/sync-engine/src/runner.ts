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

type NotionPropertyMeta = {
  type?: string;
};

type NotionDatabaseProperties = Record<string, NotionPropertyMeta>;

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
    const databaseProperties = await getDatabaseProperties(client, notionDatabaseId);

    for await (const raw of adapter.fetch(criteria, options.credentials)) {
      const row = adapter.normalize(raw);
      const key = adapter.cacheKey(row);

      if (options.seenKeys.has(key)) {
        rowsSkipped++;
        continue;
      }

      options.seenKeys.add(key);

      // Write the row to Notion as a new page
      await writeRowToNotion(row, notionDatabaseId, client, databaseProperties);
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
  databaseProperties: NotionDatabaseProperties,
): Promise<void> {
  if (typeof row !== "object" || row === null) return;

  const entries = Object.entries(row as Record<string, unknown>);
  const properties: Record<string, unknown> = {};
  const titlePropertyName = findTitlePropertyName(databaseProperties);
  let titleSet = false;

  for (const [key, value] of entries) {
    const mapped = mapValueToNotionProperty(
      key,
      value,
      databaseProperties,
      titlePropertyName,
      titleSet,
    );
    if (mapped === undefined) continue;

    properties[key] = mapped.value;
    if (mapped.isTitle) {
      titleSet = true;
    }
  }

  if (!titleSet && titlePropertyName !== undefined) {
    properties[titlePropertyName] = {
      title: [{ type: "text", text: { content: "Imported row" } }],
    };
    titleSet = true;
  }

  if (!titleSet) {
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

async function getDatabaseProperties(
  client: NotionApiClient,
  databaseId: string,
): Promise<NotionDatabaseProperties> {
  const db = await client.call((c) =>
    (c as unknown as {
      databases: {
        retrieve(args: {
          database_id: string;
        }): Promise<{ properties?: NotionDatabaseProperties }>;
      };
    }).databases.retrieve({ database_id: databaseId }),
  );
  return db.properties ?? {};
}

function findTitlePropertyName(
  databaseProperties: NotionDatabaseProperties,
): string | undefined {
  return Object.entries(databaseProperties)
    .find(([, meta]) => meta.type === "title")?.[0];
}

function mapValueToNotionProperty(
  key: string,
  value: unknown,
  databaseProperties: NotionDatabaseProperties,
  titlePropertyName: string | undefined,
  titleSet: boolean,
): { value: Record<string, unknown>; isTitle: boolean } | undefined {
  const propertyType = databaseProperties[key]?.type;

  if (propertyType === "title") {
    if (titleSet) return undefined;
    const text = toText(value) || "Imported row";
    return {
      value: { title: [{ type: "text", text: { content: text.slice(0, 2000) } }] },
      isTitle: true,
    };
  }

  if (propertyType === "rich_text") {
    const text = toText(value);
    if (text.length === 0) return undefined;
    return {
      value: { rich_text: [{ type: "text", text: { content: text.slice(0, 2000) } }] },
      isTitle: false,
    };
  }

  if (propertyType === "number") {
    const num = toNumber(value);
    if (num === undefined) return undefined;
    return { value: { number: num }, isTitle: false };
  }

  if (propertyType === "checkbox") {
    const bool = toBoolean(value);
    if (bool === undefined) return undefined;
    return { value: { checkbox: bool }, isTitle: false };
  }

  if (propertyType === "date") {
    const iso = toDateIso(value);
    if (iso === undefined) return undefined;
    return { value: { date: { start: iso } }, isTitle: false };
  }

  if (propertyType === "url") {
    const text = toText(value);
    if (text.length === 0) return undefined;
    return { value: { url: text }, isTitle: false };
  }

  if (propertyType === "phone_number") {
    const text = toText(value);
    if (text.length === 0) return undefined;
    return { value: { phone_number: text }, isTitle: false };
  }

  if (propertyType === "email") {
    const text = toText(value);
    if (text.length === 0) return undefined;
    return { value: { email: text }, isTitle: false };
  }

  if (propertyType === "status") {
    const text = toText(value);
    if (text.length === 0) return undefined;
    return { value: { status: { name: text } }, isTitle: false };
  }

  if (propertyType === "select") {
    const text = toText(value);
    if (text.length === 0) return undefined;
    return { value: { select: { name: text } }, isTitle: false };
  }

  if (propertyType === "multi_select") {
    const values = Array.isArray(value)
      ? value.map((v) => toText(v)).filter((v) => v.length > 0)
      : toText(value)
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v.length > 0);
    if (values.length === 0) return undefined;
    return {
      value: { multi_select: values.map((name) => ({ name })) },
      isTitle: false,
    };
  }

  // Fallback for unknown schema: keep a minimal best-effort behavior.
  if (propertyType === undefined) {
    if (key === titlePropertyName && !titleSet) {
      const text = toText(value) || "Imported row";
      return {
        value: { title: [{ type: "text", text: { content: text.slice(0, 2000) } }] },
        isTitle: true,
      };
    }
    const text = toText(value);
    if (text.length > 0) {
      return {
        value: { rich_text: [{ type: "text", text: { content: text.slice(0, 2000) } }] },
        isTitle: false,
      };
    }
    const num = toNumber(value);
    if (num !== undefined) return { value: { number: num }, isTitle: false };
    const bool = toBoolean(value);
    if (bool !== undefined) return { value: { checkbox: bool }, isTitle: false };
    const iso = toDateIso(value);
    if (iso !== undefined) return { value: { date: { start: iso } }, isTitle: false };
  }

  // Skip formula, rollup, relation, files, and unsupported/readonly property types.
  return undefined;
}

function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "1" || v === "yes") return true;
    if (v === "false" || v === "0" || v === "no") return false;
  }
  return undefined;
}

function toDateIso(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return undefined;
}
