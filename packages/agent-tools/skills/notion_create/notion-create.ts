/**
 * notion-create.ts — creates a new page (row) in a Notion database.
 *
 * First retrieves the database schema to determine the correct Notion
 * property type for each key, then calls pages.create with correctly-typed
 * property values.
 */
import { NotionApiClient } from "@niche-factory/notion-client";
import type { Skill, SkillContext, JsonValue } from "../../src/types.js";

/**
 * Build a Notion property value block from a plain JS value, using
 * the known Notion property type to format it correctly.
 */
function buildPropertyValue(value: JsonValue, propType?: string): unknown {
  // Booleans and numbers are unambiguous regardless of schema type
  if (typeof value === "boolean") return { checkbox: value };
  if (typeof value === "number") return { number: value };

  // Use the schema type when known
  switch (propType) {
    case "title":
      return { title: [{ type: "text", text: { content: String(value).slice(0, 2000) } }] };
    case "url":
      return { url: typeof value === "string" ? value : String(value) };
    case "email":
      return { email: typeof value === "string" ? value : String(value) };
    case "phone_number":
      return { phone_number: typeof value === "string" ? value : String(value) };
    case "select":
      return { select: { name: String(value) } };
    case "multi_select": {
      const items = Array.isArray(value) ? value : [value];
      return { multi_select: items.map((v) => ({ name: String(v) })) };
    }
    case "date": {
      const dateStr = typeof value === "string" ? value : String(value);
      return { date: { start: dateStr } };
    }
    case "number":
      return { number: typeof value === "number" ? value : Number(value) };
    case "checkbox":
      return { checkbox: typeof value === "boolean" ? value : Boolean(value) };
    case "status":
      return { status: { name: String(value) } };
    default:
      break;
  }

  // Auto-detect from value shape when property type is unknown
  if (Array.isArray(value)) {
    return { multi_select: value.map((v) => ({ name: String(v) })) };
  }
  if (typeof value === "string") {
    return { rich_text: [{ type: "text", text: { content: value.slice(0, 2000) } }] };
  }
  return {
    rich_text: [
      { type: "text", text: { content: JSON.stringify(value).slice(0, 2000) } },
    ],
  };
}

export const notionCreateSkill: Skill = {
  name: "notion_create",
  description:
    "Creates a new row (page) in a Notion database. Retrieves the database schema automatically to map property types correctly. Use this to add vendors, guests, budget items, tasks, or any other records.",
  inputSchema: {
    type: "object",
    properties: {
      database_id: {
        type: "string",
        description:
          "The 32-character Notion database ID. Found in the database URL: notion.so/.../<database_id>?v=...",
      },
      properties: {
        type: "object",
        description:
          "Map of property names (exact match) to values. Strings, numbers, booleans, and arrays of strings are all accepted.",
      },
    },
    required: ["database_id", "properties"],
  },
  async handler(args, ctx: SkillContext): Promise<string> {
    if (ctx.notionToken === undefined) {
      return "Error: no Notion token available for this session.";
    }

    const databaseId = args["database_id"];
    const properties = args["properties"];

    if (typeof databaseId !== "string" || databaseId.trim() === "") {
      return "Error: database_id must be a non-empty string.";
    }
    if (
      typeof properties !== "object" ||
      properties === null ||
      Array.isArray(properties)
    ) {
      return "Error: properties must be a JSON object.";
    }

    const client = new NotionApiClient({ auth: ctx.notionToken });

    // Retrieve the database schema to resolve property types
    const propTypes: Record<string, string> = {};
    try {
      const db = await client.call((c) =>
        c.databases.retrieve({ database_id: databaseId.trim() }),
      );
      const dbProps = (db as Record<string, unknown>)["properties"] as
        | Record<string, Record<string, unknown>>
        | undefined;
      if (dbProps !== undefined) {
        for (const [name, prop] of Object.entries(dbProps)) {
          if (typeof prop["type"] === "string") {
            propTypes[name] = prop["type"];
          }
        }
      }
    } catch {
      // Proceed without schema info — property type auto-detection will apply
    }

    // Build Notion property value objects with correct types
    const notionProps: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(
      properties as Record<string, JsonValue>,
    )) {
      notionProps[key] = buildPropertyValue(val, propTypes[key]);
    }

    try {
      const page = await client.call((c) =>
        c.pages.create({
          parent: { database_id: databaseId.trim() },
          properties: notionProps as never,
        }),
      );
      const pageId = (page as Record<string, unknown>)["id"] as string;
      const keys = Object.keys(notionProps).join(", ");
      return `Created new entry [${keys}] in database ${databaseId}. Page ID: ${pageId}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return `Error creating Notion entry: ${message}`;
    }
  },
};
