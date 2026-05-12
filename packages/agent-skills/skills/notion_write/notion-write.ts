/**
 * notion-write.ts — writes property values to a Notion page.
 */
import { NotionApiClient } from "@niche-factory/notion-client";
import type { Skill, SkillContext, JsonValue } from "../../src/types.js";

function buildRichText(value: string): { rich_text: Array<{ text: { content: string } }> } {
  // Notion rich_text blocks are limited to 2000 chars each
  return {
    rich_text: [{ text: { content: value.slice(0, 2000) } }],
  };
}

function buildPropertyValue(value: JsonValue): unknown {
  if (typeof value === "string") return buildRichText(value);
  if (typeof value === "number") return { number: value };
  if (typeof value === "boolean") return { checkbox: value };
  // Fallback: stringify objects/arrays as rich_text
  return buildRichText(JSON.stringify(value));
}

export const notionWriteSkill: Skill = {
  name: "notion_write",
  description: "Writes one or more property values to an existing Notion page.",
  inputSchema: {
    type: "object",
    properties: {
      page_id: { type: "string", description: "The Notion page ID to update." },
      properties: {
        type: "object",
        description: "Map of Notion property names to their new values.",
      },
    },
    required: ["page_id", "properties"],
  },
  async handler(args, ctx: SkillContext): Promise<string> {
    if (ctx.notionToken === undefined) {
      return "Error: no Notion token available for this customer.";
    }

    const pageId = args["page_id"];
    const properties = args["properties"];

    if (typeof pageId !== "string" || pageId.trim() === "") {
      return "Error: page_id must be a non-empty string.";
    }
    if (typeof properties !== "object" || properties === null || Array.isArray(properties)) {
      return "Error: properties must be a JSON object.";
    }

    const client = new NotionApiClient({ auth: ctx.notionToken });

    const notionProps: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(properties as Record<string, JsonValue>)) {
      notionProps[key] = buildPropertyValue(val);
    }

    try {
      await client.call((c) =>
        c.pages.update({ page_id: pageId.trim(), properties: notionProps as never }),
      );
      const keys = Object.keys(notionProps).join(", ");
      return `Successfully updated properties [${keys}] on page ${pageId}.`;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return `Error writing to Notion: ${message}`;
    }
  },
};
