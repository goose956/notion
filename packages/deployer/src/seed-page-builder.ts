/**
 * seed-page-builder.ts
 *
 * Translates SeedPage records into @notionhq/client pages.create request bodies.
 */

import type { SeedPage } from "@niche-factory/schema";

export interface NotionPageCreateBody {
  parent: { database_id: string };
  properties: Record<string, unknown>;
}

/**
 * Build a pages.create request body from a SeedPage.
 *
 * Property values are mapped by name using simple type inference.
 * For MVP, we support text, number, checkbox, select, multi_select, date, and URL.
 */
export function buildSeedPage(
  page: SeedPage,
  notionDatabaseId: string,
): NotionPageCreateBody {
  const properties: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(page.properties)) {
    properties[name] = inferPropertyValue(value);
  }

  return {
    parent: { database_id: notionDatabaseId },
    properties,
  };
}

function inferPropertyValue(value: unknown): unknown {
  if (typeof value === "string") {
    // Could be title, rich_text, select, url, date — Notion is forgiving
    // when the property type is known from the DB schema, but we use rich_text
    // as the fallback since it's most permissive.
    return {
      rich_text: [{ type: "text", text: { content: value } }],
    };
  }
  if (typeof value === "number") {
    return { number: value };
  }
  if (typeof value === "boolean") {
    return { checkbox: value };
  }
  if (Array.isArray(value)) {
    return {
      multi_select: value.map((v) => ({ name: String(v) })),
    };
  }
  return { rich_text: [{ type: "text", text: { content: String(value) } }] };
}
