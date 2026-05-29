/**
 * lib/notion-sync.ts — Shared Notion sync utilities.
 *
 * Exported from here (not from the route file) so they can be imported by
 * both the API route and Inngest background functions without violating
 * Next.js's constraint that route files may only export HTTP handlers.
 */
import {
  listAppWorkspacesByUser,
  listAppDatabasesByWorkspace,
  listAppRowsByDatabase,
  getLatestDeployByNiche,
} from "@niche-factory/db";
import { NotionApiClient } from "@niche-factory/notion-client";

export type SyncSchedule = "off" | "daily" | "weekly";

export function syncScheduleKey(userEmail: string, nicheId: string) {
  return `notion_sync_schedule:${userEmail}:${nicheId}`;
}

function buildNotionProperty(
  type: string,
  value: unknown,
): Record<string, unknown> | null {
  if (value === null || value === undefined || value === "") return null;
  const v = value as string | number | boolean;
  switch (type) {
    case "title":
      return { title: [{ text: { content: String(v) } }] };
    case "rich_text":
      return { rich_text: [{ text: { content: String(v) } }] };
    case "number":
      return { number: typeof v === "number" ? v : parseFloat(String(v)) || null };
    case "select":
      return { select: { name: String(v) } };
    case "multi_select":
      return {
        multi_select: String(v)
          .split(",")
          .map((s) => ({ name: s.trim() }))
          .filter((s) => s.name),
      };
    case "checkbox":
      return { checkbox: v === true || v === "true" };
    case "url":
      return { url: String(v) };
    case "email":
      return { email: String(v) };
    case "phone_number":
      return { phone_number: String(v) };
    case "date":
      return { date: { start: String(v) } };
    case "status":
      return { status: { name: String(v) } };
    default:
      return null;
  }
}

export async function syncAppToNotion(
  userEmail: string,
  notionToken: string,
  nicheId?: string,
): Promise<{ created: number; updated: number; skipped: number }> {
  const notion = new NotionApiClient({ auth: notionToken });

  let workspaces = await listAppWorkspacesByUser(userEmail);
  if (nicheId) workspaces = workspaces.filter((w) => w.nichePackId === nicheId);

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const workspace of workspaces) {
    const deploy = await getLatestDeployByNiche(workspace.nichePackId).catch(() => undefined);
    if (!deploy) continue;

    const dbMap = (deploy.databaseIdMap as Record<string, string> | null) ?? {};
    if (Object.keys(dbMap).length === 0) continue;

    const appDatabases = await listAppDatabasesByWorkspace(workspace.id).catch(() => []);

    for (const appDb of appDatabases) {
      const notionDbId = dbMap[appDb.packDbId];
      if (!notionDbId) continue;

      // Fetch Notion database schema so we know the property types
      let notionSchema: Record<string, { type: string }> = {};
      try {
        const dbMeta = await notion.call((c) =>
          c.databases.retrieve({ database_id: notionDbId }),
        );
        notionSchema = (dbMeta as unknown as { properties: Record<string, { type: string }> }).properties;
      } catch {
        totalSkipped++;
        continue; // DB deleted or inaccessible in Notion
      }

      // Index existing Notion rows by their title so we can upsert
      const notionPageByTitle: Record<string, string> = {};
      try {
        let cursor: string | undefined;
        do {
          const result = await notion.call((c) =>
            c.databases.query({
              database_id: notionDbId,
              page_size: 100,
              ...(cursor ? { start_cursor: cursor } : {}),
            }),
          );
          for (const page of result.results) {
            const props = (page as unknown as { properties: Record<string, Record<string, unknown>> }).properties;
            for (const prop of Object.values(props)) {
              if (prop["type"] === "title") {
                const title = (prop["title"] as Array<{ plain_text: string }>)
                  ?.map((t) => t.plain_text)
                  .join("")
                  .trim();
                if (title) notionPageByTitle[title] = page.id;
              }
            }
          }
          cursor = result.has_more ? (result.next_cursor ?? undefined) : undefined;
        } while (cursor);
      } catch {
        // Can't read existing rows — will create duplicates; acceptable fallback
      }

      // Fetch all app rows (up to 200)
      const appRows = await listAppRowsByDatabase(appDb.id, { limit: 200 }).catch(() => []);

      for (const row of appRows) {
        const props = row.properties as Record<string, unknown>;

        // Build Notion-formatted properties, skipping internal __ keys
        const notionProps: Record<string, unknown> = {};
        let rowTitle = "";

        for (const [name, value] of Object.entries(props)) {
          if (name.startsWith("__")) continue;
          const schemaProp = notionSchema[name];
          if (!schemaProp) continue;
          const built = buildNotionProperty(schemaProp.type, value);
          if (built !== null) {
            notionProps[name] = built;
            if (schemaProp.type === "title") rowTitle = String(value ?? "").trim();
          }
        }

        if (Object.keys(notionProps).length === 0) continue;

        const existingPageId = rowTitle ? notionPageByTitle[rowTitle] : undefined;

        try {
          if (existingPageId) {
            await notion.call((c) =>
              c.pages.update({
                page_id: existingPageId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                properties: notionProps as any,
              }),
            );
            totalUpdated++;
          } else {
            await notion.call((c) =>
              c.pages.create({
                parent: { database_id: notionDbId },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                properties: notionProps as any,
              }),
            );
            totalCreated++;
          }
        } catch {
          totalSkipped++;
        }
      }
    }
  }

  return { created: totalCreated, updated: totalUpdated, skipped: totalSkipped };
}
