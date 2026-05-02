/**
 * relation-resolver.ts
 *
 * Second-pass: patches relation and rollup properties onto already-created
 * Notion databases, now that all database Notion IDs are known.
 */

import type { Property } from "@niche-factory/schema";
import type { NotionApiClient } from "@niche-factory/notion-client";
import {
  buildRelationProperty,
  buildProperty,
} from "./property-builders.js";

/**
 * Patch all deferred relation + rollup properties onto their databases.
 *
 * @param databases  - Array of { packDbId, notionDbId, properties }
 * @param idMap      - Map from pack DB id → Notion DB id
 * @param client     - Rate-limited Notion API client
 */
export async function resolveRelations(
  databases: Array<{
    packDbId: string;
    notionDbId: string;
    properties: Property[];
  }>,
  idMap: Record<string, string>,
  client: NotionApiClient,
): Promise<void> {
  for (const db of databases) {
    const relationProps = db.properties.filter(
      (p): p is Extract<Property, { type: "relation" }> => p.type === "relation",
    );
    const rollupProps = db.properties.filter(
      (p): p is Extract<Property, { type: "rollup" }> => p.type === "rollup",
    );

    if (relationProps.length === 0 && rollupProps.length === 0) continue;

    const patchProperties: Record<string, unknown> = {};

    for (const rel of relationProps) {
      const notionTargetDbId = idMap[rel.targetDatabaseId];
      if (notionTargetDbId === undefined) {
        throw new Error(
          `Relation '${rel.name}' on database '${db.packDbId}' references ` +
            `target database '${rel.targetDatabaseId}' which was not found in the deployed pack.`,
        );
      }
      patchProperties[rel.name] = buildRelationProperty(rel, notionTargetDbId);
    }

    for (const rollup of rollupProps) {
      const built = buildProperty(rollup);
      if (built !== null) {
        patchProperties[rollup.name] = built;
      }
    }

    if (Object.keys(patchProperties).length > 0) {
      await client.call((c) =>
        c.databases.update({
          database_id: db.notionDbId,
          properties: patchProperties,
        } as unknown as Parameters<typeof c.databases.update>[0]),
      );
    }
  }
}
