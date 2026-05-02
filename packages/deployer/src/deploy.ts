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

  // ── Pass 1: Create all databases (without relations) ──────────────────────
  const dbsForRelationPass: Array<{
    packDbId: string;
    notionDbId: string;
    properties: typeof pack.databases[number]["properties"];
  }> = [];

  for (const db of pack.databases) {
    const { notionProperties } = buildPropertiesForCreate(db.properties);

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
    const created = await client.call((c) =>
      c.databases.create(createBody as Parameters<typeof c.databases.create>[0]),
    );

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
