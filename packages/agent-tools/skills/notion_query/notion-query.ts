/**
 * notion-query.ts — reads properties from a Notion page or queries a database.
 */
import { NotionApiClient } from "@niche-factory/notion-client";
import type { Skill, SkillContext } from "../../src/types.js";

// PageObjectResponse shape (inline to avoid deep build path imports)
interface RichTextItem { plain_text: string }
interface SelectItem { name: string }
interface DateValue { start: string }
type NotionPropertyValue =
  | { type: "title"; title: RichTextItem[] }
  | { type: "rich_text"; rich_text: RichTextItem[] }
  | { type: "number"; number: number | null }
  | { type: "checkbox"; checkbox: boolean | null }
  | { type: "select"; select: SelectItem | null }
  | { type: "multi_select"; multi_select: SelectItem[] }
  | { type: "date"; date: DateValue | null }
  | { type: "url"; url: string | null }
  | { type: "email"; email: string | null }
  | { type: "phone_number"; phone_number: string | null }
  | { type: string; [key: string]: unknown };
interface PageObjectResponse {
  id: string;
  properties: Record<string, NotionPropertyValue>;
}

/** Extract a plain JS value from a Notion property object */
function extractPropertyValue(prop: Record<string, unknown>): unknown {
  const type = prop["type"] as string | undefined;
  switch (type) {
    case "title":
      return ((prop["title"] as Array<{ plain_text: string }>) ?? [])
        .map((r) => r.plain_text)
        .join("");
    case "rich_text":
      return ((prop["rich_text"] as Array<{ plain_text: string }>) ?? [])
        .map((r) => r.plain_text)
        .join("");
    case "number":
      return prop["number"] ?? null;
    case "checkbox":
      return prop["checkbox"] ?? null;
    case "select":
      return (prop["select"] as { name: string } | null)?.name ?? null;
    case "multi_select":
      return ((prop["multi_select"] as Array<{ name: string }>) ?? []).map((s) => s.name);
    case "date":
      return (prop["date"] as { start: string } | null)?.start ?? null;
    case "url":
      return prop["url"] ?? null;
    case "email":
      return prop["email"] ?? null;
    case "phone_number":
      return prop["phone_number"] ?? null;
    default:
      return undefined; // Skip unsupported types (relation, rollup, formula, etc.)
  }
}

function pageToRecord(page: PageObjectResponse): Record<string, unknown> {
  const result: Record<string, unknown> = { _id: page.id };
  for (const [name, prop] of Object.entries(page.properties)) {
    const value = extractPropertyValue(prop as Record<string, unknown>);
    if (value !== undefined) {
      result[name] = value;
    }
  }
  return result;
}

export const notionQuerySkill: Skill = {
  name: "notion_query",
  description:
    "Reads properties from a Notion page (mode=page) or queries a database for matching pages (mode=database).",
  inputSchema: {
    type: "object",
    properties: {
      mode: {
        type: "string",
        description: 'Either "page" to read a single page or "database" to query.',
      },
      id: { type: "string", description: "Page ID (mode=page) or database ID (mode=database)." },
      filter_property: {
        type: "string",
        description: "(mode=database) Property name to filter by.",
      },
      filter_value: {
        type: "string",
        description: "(mode=database) Value to match (text contains).",
      },
      limit: {
        type: "number",
        description: "(mode=database) Max results. Defaults to 10.",
      },
    },
    required: ["mode", "id"],
  },
  async handler(args, ctx: SkillContext): Promise<string> {
    if (ctx.notionToken === undefined) {
      return "Error: no Notion token available for this customer.";
    }

    const mode = args["mode"];
    const id = args["id"];

    if (typeof id !== "string" || id.trim() === "") {
      return "Error: id must be a non-empty string.";
    }

    const client = new NotionApiClient({ auth: ctx.notionToken });

    try {
      if (mode === "page") {
        const page = await client.call((c) =>
          c.pages.retrieve({ page_id: id.trim() }),
        );
        const record = pageToRecord(page as PageObjectResponse);
        return JSON.stringify(record, null, 2);
      }

      if (mode === "database") {
        const filterProperty = args["filter_property"];
        const filterValue = args["filter_value"];
        const limit = typeof args["limit"] === "number" ? args["limit"] : 10;

        const response = await client.call((c) =>
          c.databases.query({
            database_id: id.trim(),
            page_size: Math.min(limit, 100),
            ...(typeof filterProperty === "string" &&
            filterProperty !== "" &&
            typeof filterValue === "string"
              ? {
                  filter: {
                    property: filterProperty,
                    rich_text: { contains: filterValue },
                  },
                }
              : {}),
          }),
        );

        const records = (response.results as PageObjectResponse[]).map(pageToRecord);
        return JSON.stringify(records, null, 2);
      }

      return `Error: mode must be "page" or "database", got "${String(mode)}".`;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return `Error querying Notion: ${message}`;
    }
  },
};
