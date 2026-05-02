/**
 * property-builders.ts
 *
 * Translates each PropertySchema variant into the exact request shape
 * required by @notionhq/client's databases.create / databases.update APIs.
 *
 * Reference: https://developers.notion.com/reference/property-schema-object
 *
 * IMPORTANT: Relation properties cannot be set on the first pass because
 * the target database's Notion ID isn't known yet. They are handled
 * separately in relation-resolver.ts after all databases are created.
 */

import type { Property } from "@niche-factory/schema";

/**
 * The raw property schema object accepted by Notion's databases.create API.
 * Using `Record<string, unknown>` because @notionhq/client's own types for
 * property schemas are deeply nested and differ between create/update.
 */
export type NotionPropertySchema = Record<string, unknown>;

/**
 * Build the `properties` map for a Notion databases.create call.
 *
 * Relation properties are excluded — they are added in a second pass
 * once all database Notion IDs are known. Returns both the properties
 * map and the list of relations that need a second-pass patch.
 */
export function buildPropertiesForCreate(properties: Property[]): {
  notionProperties: Record<string, NotionPropertySchema>;
  /** Properties that need a second-pass patch after all DBs are created */
  deferredRelations: Array<Extract<Property, { type: "relation" }>>;
} {
  const notionProperties: Record<string, NotionPropertySchema> = {};
  const deferredRelations: Array<Extract<Property, { type: "relation" }>> = [];

  for (const prop of properties) {
    if (prop.type === "relation") {
      // Defer — target Notion DB ID not known yet on pass 1
      deferredRelations.push(prop);
      continue;
    }
    // Rollup depends on a relation being present first — also defer
    if (prop.type === "rollup") {
      continue;
    }
    const built = buildProperty(prop);
    if (built !== null) {
      notionProperties[prop.name] = built;
    }
  }

  return { notionProperties, deferredRelations };
}

/**
 * Build a single Notion property schema object from a PropertySchema.
 * Returns null for types that cannot be set via the API (created_time etc.)
 */
export function buildProperty(prop: Property): NotionPropertySchema | null {
  switch (prop.type) {
    case "title":
      return { title: {} };

    case "rich_text":
      return { rich_text: {} };

    case "number":
      return { number: { format: prop.format ?? "number" } };

    case "select":
      return {
        select: {
          options: (prop.options ?? []).map((o) => ({
            name: o.name,
            ...(o.color !== undefined ? { color: o.color } : {}),
          })),
        },
      };

    case "multi_select":
      return {
        multi_select: {
          options: (prop.options ?? []).map((o) => ({
            name: o.name,
            ...(o.color !== undefined ? { color: o.color } : {}),
          })),
        },
      };

    case "status":
      // Notion creates default status groups automatically
      return { status: {} };

    case "date":
      return { date: {} };

    case "people":
      return { people: {} };

    case "files":
      return { files: {} };

    case "checkbox":
      return { checkbox: {} };

    case "url":
      return { url: {} };

    case "email":
      return { email: {} };

    case "phone_number":
      return { phone_number: {} };

    case "formula":
      return { formula: { expression: prop.expression } };

    case "relation":
      // Handled in second pass — should not reach here
      return null;

    case "rollup":
      // Handled in second pass after relation exists
      return {
        rollup: {
          relation_property_name: prop.relationPropertyName,
          rollup_property_name: prop.rollupPropertyName,
          function: prop.function,
        },
      };

    case "created_time":
      // Read-only — Notion adds this automatically, can't set via API
      return null;

    case "created_by":
      return null;

    case "last_edited_time":
      return null;

    case "last_edited_by":
      return null;

    case "unique_id":
      return {
        unique_id: {
          ...(prop.prefix !== undefined ? { prefix: prop.prefix } : {}),
        },
      };

    case "verification":
      return { verification: {} };

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = prop;
      return null;
    }
  }
}

/**
 * Build the relation property schema for the second pass,
 * now that notionTargetDbId is known.
 */
export function buildRelationProperty(
  prop: Extract<Property, { type: "relation" }>,
  notionTargetDbId: string,
): NotionPropertySchema {
  if (prop.dualProperty === true && prop.syncedPropertyName !== undefined) {
    return {
      relation: {
        database_id: notionTargetDbId,
        type: "dual_property",
        dual_property: {
          synced_property_name: prop.syncedPropertyName,
        },
      },
    };
  }
  return {
    relation: {
      database_id: notionTargetDbId,
      type: "single_property",
      single_property: {},
    },
  };
}
