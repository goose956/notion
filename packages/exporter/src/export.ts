import { NichePackSchema, type NichePack, type Database, type Property } from "@niche-factory/schema";
import type { NotionApiClient } from "@niche-factory/notion-client";
import { readProperty } from "./property-readers.js";

export interface ExportOptions {
  /** The Notion page ID that contains the niche's databases */
  parentPageId: string;
  /** Map of pack DB id → Notion DB id (from the original deploy result) */
  databaseIds: Record<string, string>;
  /** Preserve any fields in the existing pack that Notion can't round-trip */
  existingPack?: NichePack;
}

/**
 * exportPack() — reads a deployed Notion workspace and reconstructs a NichePack.
 *
 * A pack deployed → exported → re-deployed must produce the same workspace.
 *
 * Fields that Notion doesn't store (dataSources, enrichmentPrompts,
 * onboardingQuestions, seedPages) are preserved verbatim from existingPack.
 * If no existingPack is provided they are omitted (empty arrays).
 *
 * @param client  - Rate-limited Notion API client
 * @param options - Export options including the database ID map
 */
export async function exportPack(
  client: NotionApiClient,
  options: ExportOptions,
): Promise<NichePack> {
  const { databaseIds, existingPack } = options;

  // Reverse map: Notion DB id → pack DB id
  const reverseIdMap = Object.fromEntries(
    Object.entries(databaseIds).map(([packId, notionId]) => [notionId, packId]),
  );

  const databases: Database[] = [];

  for (const [packDbId, notionDbId] of Object.entries(databaseIds)) {
    // We always get a full DatabaseObjectResponse from databases.retrieve
    const notionDb = await client.call((c) =>
      c.databases.retrieve({ database_id: notionDbId }),
    ) as unknown as {
      title: Array<{ plain_text?: string }>;
      icon: { type?: string; emoji?: string } | null;
      properties: Record<string, Record<string, unknown> & { type: string; id: string }>;
    };

    // Extract the database title
    const dbName =
      notionDb.title.map((b) => b.plain_text ?? "").join("") || packDbId;

    // Map properties back to PropertySchema shapes
    const rawProps = notionDb.properties;

    const properties: Property[] = [];
    for (const [propName, rawProp] of Object.entries(rawProps)) {
      const mapped = readProperty(propName, rawProp);
      if (mapped === null) continue;

      // Reverse-map relation targetDatabaseId from Notion DB id → pack DB id
      if (mapped.type === "relation") {
        const packTargetId = reverseIdMap[mapped.targetDatabaseId];
        if (packTargetId !== undefined) {
          properties.push({ ...mapped, targetDatabaseId: packTargetId });
        } else {
          // Relation points to a DB outside this pack — keep Notion ID with a warning prefix
          properties.push(mapped);
        }
        continue;
      }
      properties.push(mapped);
    }

    // Ensure title property is first (Notion always has one)
    const titleProp = properties.find((p) => p.type === "title");
    const rest = properties.filter((p) => p.type !== "title");
    const orderedProperties: Property[] = titleProp
      ? [titleProp, ...rest]
      : properties;

    // Try to recover the icon from the Notion database
    const icon =
      notionDb.icon?.type === "emoji" ? notionDb.icon.emoji : undefined;

    // Preserve views from the existing pack (Notion API doesn't expose view config)
    const existingDb = existingPack?.databases.find((d) => d.id === packDbId);

    databases.push({
      id: packDbId,
      name: dbName,
      description: existingDb?.description,
      icon,
      properties: orderedProperties,
      views: existingDb?.views,
    });
  }

  // Build the final pack, preserving all non-Notion-storable fields
  const raw: NichePack = {
    version: existingPack?.version ?? "1.0.0",
    id: existingPack?.id ?? "exported-pack",
    name: existingPack?.name ?? "Exported Pack",
    description: existingPack?.description ?? "",
    tagline: existingPack?.tagline,
    databases,
    dataSources: existingPack?.dataSources ?? [],
    enrichmentPrompts: existingPack?.enrichmentPrompts,
    seedPages: existingPack?.seedPages,
    onboardingQuestions: existingPack?.onboardingQuestions,
  };

  // Validate the reconstructed pack before returning
  return NichePackSchema.parse(raw);
}
