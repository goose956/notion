import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { listNichePacks, getLatestDeployByNiche } from "@niche-factory/db";
import { NotionApiClient } from "@niche-factory/notion-client";
import type { NichePack } from "@niche-factory/schema";

// ─── Types returned to the client ────────────────────────────────────────────

export interface WorkspaceProperty {
  id: string;
  name: string;
  type: string;
}

export interface WorkspaceRow {
  pageId: string;
  /** Map of property name → display value */
  properties: Record<string, string | number | boolean | null>;
}

export interface WorkspaceDatabase {
  notionId: string;
  nicheId: string;
  nicheName: string;
  dbId: string;
  dbName: string;
  icon: string | null;
  properties: WorkspaceProperty[];
  rows: WorkspaceRow[];
  hasMore: boolean;
}

// ─── Helpers: extract a display value from any Notion property ───────────────

function extractValue(prop: Record<string, unknown>): string | number | boolean | null {
  const type = prop["type"] as string | undefined;
  if (!type) return null;

  switch (type) {
    case "title": {
      const arr = (prop["title"] as Array<{ plain_text: string }>) ?? [];
      return arr.map((t) => t.plain_text).join("") || null;
    }
    case "rich_text": {
      const arr = (prop["rich_text"] as Array<{ plain_text: string }>) ?? [];
      return arr.map((t) => t.plain_text).join("") || null;
    }
    case "number":
      return (prop["number"] as number | null) ?? null;
    case "select":
      return ((prop["select"] as { name: string } | null)?.name) ?? null;
    case "multi_select": {
      const opts = (prop["multi_select"] as Array<{ name: string }>) ?? [];
      return opts.map((o) => o.name).join(", ") || null;
    }
    case "checkbox":
      return (prop["checkbox"] as boolean) ?? null;
    case "url":
      return (prop["url"] as string | null) ?? null;
    case "email":
      return (prop["email"] as string | null) ?? null;
    case "phone_number":
      return (prop["phone_number"] as string | null) ?? null;
    case "date": {
      const d = prop["date"] as { start: string } | null;
      return d?.start ?? null;
    }
    case "formula": {
      const f = prop["formula"] as Record<string, unknown> | null;
      if (!f) return null;
      const ft = f["type"] as string;
      if (ft === "number") return (f["number"] as number | null) ?? null;
      if (ft === "string") return (f["string"] as string | null) ?? null;
      if (ft === "boolean") return (f["boolean"] as boolean | null) ?? null;
      return null;
    }
    case "relation": {
      const rels = (prop["relation"] as Array<{ id: string }>) ?? [];
      return rels.length > 0 ? `${rels.length} linked` : null;
    }
    case "rollup": {
      const r = prop["rollup"] as Record<string, unknown> | null;
      if (!r) return null;
      const rt = r["type"] as string;
      if (rt === "number") return (r["number"] as number | null) ?? null;
      return null;
    }
    case "people": {
      const people = (prop["people"] as Array<{ name?: string }>) ?? [];
      return people.map((p) => p.name ?? "?").join(", ") || null;
    }
    case "status":
      return ((prop["status"] as { name: string } | null)?.name) ?? null;
    default:
      return null;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

// GET /api/members/workspace
// Returns all deployed databases + their rows (up to 50 per DB).
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notionToken = (session as unknown as Record<string, unknown>)["notionToken"] as
    | string
    | undefined;
  if (!notionToken) {
    return NextResponse.json(
      { error: "No Notion token — connect Notion first" },
      { status: 401 },
    );
  }

  const notionUserId = (session as unknown as Record<string, unknown>)["notionUserId"] as
    | string
    | undefined;

  const notion = new NotionApiClient({ auth: notionToken });
  const databases: WorkspaceDatabase[] = [];

  try {
    const packs = await listNichePacks();

    for (const packRow of packs) {
      const deploy = await getLatestDeployByNiche(packRow.id, notionUserId);
      if (!deploy) continue;

      const dbMap = deploy.databaseIdMap as Record<string, string> | null | undefined;
      if (!dbMap || Object.keys(dbMap).length === 0) continue;

      const pack = packRow.schemaSnapshot as unknown as NichePack;

      for (const dbDef of pack.databases) {
        const notionDbId = dbMap[dbDef.id];
        if (!notionDbId) continue;

        // Fetch DB schema (property definitions)
        let schemaProps: WorkspaceProperty[] = [];
        let rows: WorkspaceRow[] = [];
        let hasMore = false;

        try {
          const dbMeta = await notion.call((c) =>
            c.databases.retrieve({ database_id: notionDbId }),
          );

          const propMap = (dbMeta as unknown as Record<string, unknown>)["properties"] as
            | Record<string, { id: string; name: string; type: string }>
            | undefined;

          if (propMap) {
            schemaProps = Object.values(propMap).map((p) => ({
              id: p.id,
              name: p.name,
              type: p.type,
            }));
          }

          // Fetch rows — first page only (up to 50)
          const queryResult = await notion.call((c) =>
            c.databases.query({
              database_id: notionDbId,
              page_size: 50,
            }),
          );

          hasMore = queryResult.has_more;

          for (const page of queryResult.results) {
            if (page.object !== "page") continue;
            const pageProps = (page as unknown as Record<string, unknown>)["properties"] as
              | Record<string, Record<string, unknown>>
              | undefined;
            if (!pageProps) continue;

            const rowProps: Record<string, string | number | boolean | null> = {};
            for (const [name, val] of Object.entries(pageProps)) {
              rowProps[name] = extractValue(val);
            }
            rows.push({ pageId: page.id, properties: rowProps });
          }
        } catch {
          // DB may have been deleted in Notion — skip it
        }

        databases.push({
          notionId: notionDbId,
          nicheId: pack.id,
          nicheName: pack.name,
          dbId: dbDef.id,
          dbName: dbDef.name,
          icon: dbDef.icon ?? null,
          properties: schemaProps,
          rows,
          hasMore,
        });
      }
    }
  } catch {
    return NextResponse.json({ databases: [] });
  }

  return NextResponse.json({ databases });
}

// ─── POST: create a new row in a database ────────────────────────────────────

function buildNotionProperty(
  type: string,
  value: string | number | boolean | null,
): Record<string, unknown> | null {
  if (value === null || value === "") return null;
  switch (type) {
    case "title":
      return { title: [{ text: { content: String(value) } }] };
    case "rich_text":
      return { rich_text: [{ text: { content: String(value) } }] };
    case "number":
      return { number: typeof value === "number" ? value : parseFloat(String(value)) || null };
    case "select":
      return { select: { name: String(value) } };
    case "multi_select":
      return {
        multi_select: String(value)
          .split(",")
          .map((s) => ({ name: s.trim() }))
          .filter((s) => s.name),
      };
    case "checkbox":
      return { checkbox: value === true || value === "true" };
    case "url":
      return { url: String(value) };
    case "email":
      return { email: String(value) };
    case "phone_number":
      return { phone_number: String(value) };
    case "date":
      return { date: { start: String(value) } };
    case "status":
      return { status: { name: String(value) } };
    default:
      return null;
  }
}

const CreateBodySchema = z.object({
  databaseId: z.string().min(1),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  propertyTypes: z.record(z.string(), z.string()),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notionToken = (session as unknown as Record<string, unknown>)["notionToken"] as
    | string
    | undefined;
  if (!notionToken) {
    return NextResponse.json({ error: "No Notion token" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }

  const notionProperties: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(parsed.data.properties)) {
    const type = parsed.data.propertyTypes[name];
    if (!type) continue;
    const built = buildNotionProperty(type, value);
    if (built !== null) notionProperties[name] = built;
  }

  const notion = new NotionApiClient({ auth: notionToken });

  try {
    const page = await notion.call((c) =>
      c.pages.create({
        parent: { database_id: parsed.data.databaseId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        properties: notionProperties as any,
      }),
    );
    return NextResponse.json({ pageId: page.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
