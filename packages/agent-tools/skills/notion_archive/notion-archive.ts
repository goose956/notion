/**
 * notion-archive.ts — archives (removes) a Notion page.
 *
 * Notion's API does not support permanent deletion; archiving is the
 * equivalent — the page disappears from all database views.
 */
import { NotionApiClient } from "@niche-factory/notion-client";
import type { Skill, SkillContext } from "../../src/types.js";

export const notionArchiveSkill: Skill = {
  name: "notion_archive",
  description:
    "Archives (removes) a page from a Notion database. Archiving is Notion's equivalent of deletion — the entry disappears from all views. Use notion_query first to find the page_id of the entry you want to remove.",
  inputSchema: {
    type: "object",
    properties: {
      page_id: {
        type: "string",
        description: "The Notion page ID to archive. Use notion_query to find it first.",
      },
    },
    required: ["page_id"],
  },
  async handler(args, ctx: SkillContext): Promise<string> {
    if (ctx.notionToken === undefined) {
      return "Error: no Notion token available for this session.";
    }

    const pageId = args["page_id"];
    if (typeof pageId !== "string" || pageId.trim() === "") {
      return "Error: page_id must be a non-empty string.";
    }

    const client = new NotionApiClient({ auth: ctx.notionToken });

    try {
      await client.call((c) =>
        c.pages.update({ page_id: pageId.trim(), archived: true }),
      );
      return `Page ${pageId} has been archived and removed from all database views.`;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return `Error archiving page: ${message}`;
    }
  },
};
