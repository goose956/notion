/**
 * property-readers.ts
 *
 * Reads Notion database property schema objects and maps them back to
 * PropertySchema shapes. This is the inverse of property-builders.ts.
 *
 * Reference: https://developers.notion.com/reference/property-schema-object
 */

import type { Property } from "@niche-factory/schema";

// Notion's databases.retrieve returns a `properties` map where each value
// has a `type` discriminant. We use `unknown` here and narrow via the type field.
type NotionPropSchema = Record<string, unknown> & { type: string; id: string };

/**
 * Convert a Notion property schema object back to our PropertySchema shape.
 * Returns null for types we can't meaningfully reconstruct (e.g. created_time).
 */
export function readProperty(
  name: string,
  raw: NotionPropSchema,
): Property | null {
  switch (raw.type) {
    case "title":
      return { type: "title", name };

    case "rich_text":
      return { type: "rich_text", name };

    case "number": {
      const num = raw["number"] as { format?: string } | undefined;
      return { type: "number", name, format: num?.format as Property & { type: "number" } extends { format?: infer F } ? F : undefined };
    }

    case "select": {
      const sel = raw["select"] as { options?: Array<{ name: string; color?: string }> } | undefined;
      return {
        type: "select",
        name,
        options: sel?.options?.map((o) => ({ name: o.name, color: o.color as Property & { type: "select" } extends { options?: Array<infer O> } ? O extends { color?: infer C } ? C : undefined : undefined })) ?? [],
      };
    }

    case "multi_select": {
      const ms = raw["multi_select"] as { options?: Array<{ name: string; color?: string }> } | undefined;
      return {
        type: "multi_select",
        name,
        options: ms?.options?.map((o) => ({ name: o.name, color: o.color as Property & { type: "multi_select" } extends { options?: Array<infer O> } ? O extends { color?: infer C } ? C : undefined : undefined })) ?? [],
      };
    }

    case "status":
      return { type: "status", name };

    case "date":
      return { type: "date", name };

    case "people":
      return { type: "people", name };

    case "files":
      return { type: "files", name };

    case "checkbox":
      return { type: "checkbox", name };

    case "url":
      return { type: "url", name };

    case "email":
      return { type: "email", name };

    case "phone_number":
      return { type: "phone_number", name };

    case "formula": {
      const f = raw["formula"] as { expression?: string } | undefined;
      if (!f?.expression) return null;
      return { type: "formula", name, expression: f.expression };
    }

    case "relation": {
      const rel = raw["relation"] as {
        database_id?: string;
        type?: string;
        dual_property?: { synced_property_name?: string };
      } | undefined;
      if (!rel?.database_id) return null;
      const isDual = rel.type === "dual_property";
      return {
        type: "relation",
        name,
        // NOTE: targetDatabaseId here is the Notion DB id.
        // The exporter caller must reverse-map it to the pack DB id.
        targetDatabaseId: rel.database_id,
        dualProperty: isDual,
        syncedPropertyName: isDual ? rel.dual_property?.synced_property_name : undefined,
      };
    }

    case "rollup": {
      const r = raw["rollup"] as {
        relation_property_name?: string;
        rollup_property_name?: string;
        function?: string;
      } | undefined;
      if (!r?.relation_property_name || !r.rollup_property_name || !r.function) return null;
      return {
        type: "rollup",
        name,
        relationPropertyName: r.relation_property_name,
        rollupPropertyName: r.rollup_property_name,
        function: r.function as Property & { type: "rollup" } extends { function: infer F } ? F : never,
      };
    }

    case "created_time":
      return { type: "created_time", name };

    case "created_by":
      return { type: "created_by", name };

    case "last_edited_time":
      return { type: "last_edited_time", name };

    case "last_edited_by":
      return { type: "last_edited_by", name };

    case "unique_id": {
      const uid = raw["unique_id"] as { prefix?: string } | undefined;
      return { type: "unique_id", name, prefix: uid?.prefix };
    }

    case "verification":
      return { type: "verification", name };

    default:
      // Unknown type — skip rather than throw
      return null;
  }
}
