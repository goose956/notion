import type { NichePack } from "@niche-factory/schema";
import type { NotionApiClient } from "@niche-factory/notion-client";
import { buildPropertiesForCreate } from "./property-builders.js";
import { resolveRelations } from "./relation-resolver.js";
import { buildSeedPage } from "./seed-page-builder.js";

export interface DeployResult {
  /** Notion page ID of the parent page databases were created under */
  parentPageId: string;
  /** Map of niche pack database id → Notion database id */
  databaseIds: Record<string, string>;
  durationMs: number;
}

/**
 * deploy() — the two-pass Notion workspace deployer.
 *
 * Pass 1: Create all databases without relation properties.
 *         Builds a map of pack DB id → Notion DB id.
 * Pass 2: Patch relation + rollup properties now that all Notion DB ids are known.
 * Pass 3: Create seed pages.
 *
 * @param pack          - Validated niche pack
 * @param parentPageId  - Notion page ID under which to create databases
 * @param client        - Rate-limited Notion API client
 */
export async function deploy(
  pack: NichePack,
  parentPageId: string,
  client: NotionApiClient,
): Promise<DeployResult> {
  const start = Date.now();
  const databaseIds: Record<string, string> = {};
  const existingByName = await listChildDatabasesByName(parentPageId, client);

  // ── Pass 1: Create all databases (without relations) ──────────────────────
  const dbsForRelationPass: Array<{
    packDbId: string;
    notionDbId: string;
    properties: typeof pack.databases[number]["properties"];
  }> = [];

  for (const db of pack.databases) {
    const { notionProperties } = buildPropertiesForCreate(db.properties);

    const existingNotionDbId = existingByName.get(normalizeName(db.name));
    if (existingNotionDbId !== undefined) {
      await client.call((c) =>
        c.databases.update({
          database_id: existingNotionDbId,
          title: [{ type: "text", text: { content: db.name } }],
          properties: notionProperties,
        } as unknown as Parameters<typeof c.databases.update>[0]),
      );

      databaseIds[db.id] = existingNotionDbId;
      dbsForRelationPass.push({
        packDbId: db.id,
        notionDbId: existingNotionDbId,
        properties: db.properties,
      });
      continue;
    }

    // Build the create body — use unknown cast to avoid fighting the Notion SDK
    // icon and properties types which are overly complex with exactOptionalPropertyTypes
    const createBody = {
      parent: { type: "page_id" as const, page_id: parentPageId },
      title: [{ type: "text" as const, text: { content: db.name } }],
      properties: notionProperties,
    } as Record<string, unknown>;
    if (db.icon !== undefined) {
      createBody["icon"] = { type: "emoji", emoji: db.icon };
    }
    let created: { id: string };
    try {
      created = await client.call((c) =>
        c.databases.create(createBody as Parameters<typeof c.databases.create>[0]),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to create database "${db.name}": ${msg}`);
    }

    databaseIds[db.id] = created.id;
    dbsForRelationPass.push({
      packDbId: db.id,
      notionDbId: created.id,
      properties: db.properties,
    });
  }

  // ── Pass 2: Patch relations + rollups ─────────────────────────────────────
  await resolveRelations(dbsForRelationPass, databaseIds, client);

  // ── Pass 3: Seed pages ────────────────────────────────────────────────────
  for (const seedPage of pack.seedPages ?? []) {
    const notionDbId = databaseIds[seedPage.databaseId];
    if (notionDbId === undefined) {
      throw new Error(
        `Seed page references database '${seedPage.databaseId}' ` +
          `which was not found in the deployed pack.`,
      );
    }
    const body = buildSeedPage(seedPage, notionDbId);
    await client.call((c) =>
      c.pages.create(
        body as Parameters<typeof c.pages.create>[0],
      ),
    );
  }

  return {
    parentPageId,
    databaseIds,
    durationMs: Date.now() - start,
  };
}

async function listChildDatabasesByName(
  parentPageId: string,
  client: NotionApiClient,
): Promise<Map<string, string>> {
  const byName = new Map<string, string>();
  let cursor: string | undefined;

  do {
    const response = await client.call((c) =>
      c.blocks.children.list({
        block_id: parentPageId,
        ...(cursor !== undefined ? { start_cursor: cursor } : {}),
      }),
    );

    for (const block of response.results) {
      if (!isChildDatabaseBlock(block)) continue;
      const title = block.child_database.title;
      if (title.trim().length === 0) continue;
      byName.set(normalizeName(title), block.id);
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor !== undefined);

  return byName;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function isChildDatabaseBlock(
  block: unknown,
): block is { id: string; type: "child_database"; child_database: { title: string } } {
  if (typeof block !== "object" || block === null) return false;
  const candidate = block as Record<string, unknown>;
  if (candidate["type"] !== "child_database") return false;
  if (typeof candidate["id"] !== "string") return false;
  const child = candidate["child_database"];
  if (typeof child !== "object" || child === null) return false;
  return typeof (child as Record<string, unknown>)["title"] === "string";
}
