import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  listNichePacks,
  getNichePack,
  getUserCriteria,
  getLatestDeployByNiche,
  listAppWorkspacesByUser,
  listAppDatabasesByWorkspace,
  listAppRowsByDatabase,
  createAppRow,
  getAppWorkspaceForDatabase,
  createAppWorkspace,
  createAppDatabase,
  updateAppDatabaseSchema,
  updateAppWorkspaceStatus,
} from "@niche-factory/db";
import { NotionApiClient } from "@niche-factory/notion-client";
import type { NichePack } from "@niche-factory/schema";
import { randomUUID } from "node:crypto";

// ─── Types returned to the client ────────────────────────────────────────────

export interface WorkspaceProperty {
  id: string;
  name: string;
  type: string;
  options?: string[];
  format?: string;
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

export interface WorkspaceResponse {
  databases: WorkspaceDatabase[];
  backend: "app" | "notion";
  weddingCriteria?: Record<string, unknown> | null;
}

async function provisionAppWorkspace(userId: string, pack: NichePack, schemaVersion = 1): Promise<void> {
  const workspaceId = randomUUID();
  await createAppWorkspace({
    id: workspaceId,
    userId,
    nichePackId: pack.id,
    name: pack.name,
    databaseIdMap: {},
    status: "in_progress",
    createdAt: new Date(),
  });

  const databaseIdMap: Record<string, string> = {};
  const start = Date.now();

  try {
    for (const db of pack.databases) {
      const appDbId = randomUUID();
      await createAppDatabase({
        id: appDbId,
        workspaceId,
        packDbId: db.id,
        name: db.name,
        schemaVersion,
        propertiesSchema: db.properties as unknown as Record<string, unknown>[],
        createdAt: new Date(),
      });
      databaseIdMap[db.id] = appDbId;
    }

    await updateAppWorkspaceStatus(workspaceId, {
      status: "success",
      durationMs: Date.now() - start,
      databaseIdMap,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create app databases";
    await updateAppWorkspaceStatus(workspaceId, {
      status: "failed",
      errorMessage: message,
    }).catch(() => null);
    throw err;
  }
}

async function maybeProvisionDefaultAppWorkspace(userId: string): Promise<void> {
  const defaultNicheId = "wedding-planner";
  const defaultPackRow = await getNichePack(defaultNicheId).catch(() => undefined);
  if (!defaultPackRow) return;

  const defaultPack = defaultPackRow.schemaSnapshot as unknown as NichePack;
  const hasOnboardingQuestions =
    Array.isArray(defaultPack.onboardingQuestions) &&
    defaultPack.onboardingQuestions.length > 0;
  const criteria = await getUserCriteria(userId, defaultNicheId).catch(() => undefined);
  if (!hasOnboardingQuestions || criteria) {
    await provisionAppWorkspace(userId, defaultPack, defaultPackRow.version).catch(() => null);
  }
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

  const userEmail = session.user.email;
  const notionToken = (session as unknown as Record<string, unknown>)["notionToken"] as
    | string
    | undefined;
  const hasAnyAppWorkspaces =
    typeof userEmail === "string" && userEmail.length > 0
      ? (await listAppWorkspacesByUser(userEmail).catch(() => [])).length > 0
      : false;

  const useAppBackend = !notionToken || hasAnyAppWorkspaces;
  const weddingCriteriaRow =
    typeof userEmail === "string" && userEmail.length > 0
      ? await getUserCriteria(userEmail, "wedding-planner").catch(() => undefined)
      : undefined;
  const weddingCriteria =
    (weddingCriteriaRow?.criteria as Record<string, unknown> | null | undefined) ?? null;

  // ── In-app (no Notion) flow ──────────────────────────────────────────────
  if (useAppBackend) {
    const userId = userEmail;
    if (!userId) {
      return NextResponse.json({ error: "No user identity" }, { status: 401 });
    }

    const databases: WorkspaceDatabase[] = [];

    try {
      let workspaces = await listAppWorkspacesByUser(userId).catch(() => []);

      // Self-heal: if no in-app workspace exists, provision default wedding workspace.
      if (workspaces.length === 0) {
        await maybeProvisionDefaultAppWorkspace(userId);
        workspaces = await listAppWorkspacesByUser(userId).catch(() => []);
      }

      for (const workspace of workspaces) {
        try {
          const packRow = await getNichePack(workspace.nichePackId).catch(() => undefined);
          if (!packRow) continue;
          const pack = packRow.schemaSnapshot as unknown as NichePack;

          let appDbs = await listAppDatabasesByWorkspace(workspace.id).catch(() => []);

          // Self-heal: if workspace exists but has no app DB rows, or the schema has drifted, recreate missing databases.
          const existingPackDbIds = new Set(appDbs.map((db) => db.packDbId));
          const missingDbDefs = pack.databases.filter((db) => !existingPackDbIds.has(db.id));
          if (appDbs.length === 0 || missingDbDefs.length > 0) {
            const rebuiltDatabaseIdMap: Record<string, string> = {};
            for (const db of missingDbDefs.length > 0 ? missingDbDefs : pack.databases) {
              const appDbId = randomUUID();
              await createAppDatabase({
                id: appDbId,
                workspaceId: workspace.id,
                packDbId: db.id,
                name: db.name,
                schemaVersion: packRow.version,
                propertiesSchema: db.properties as unknown as Record<string, unknown>[],
                createdAt: new Date(),
              });
              rebuiltDatabaseIdMap[db.id] = appDbId;
            }
            await updateAppWorkspaceStatus(workspace.id, {
              status: "success",
              databaseIdMap: {
                ...((workspace.databaseIdMap as Record<string, string> | null) ?? {}),
                ...rebuiltDatabaseIdMap,
              },
            }).catch(() => null);
            appDbs = await listAppDatabasesByWorkspace(workspace.id).catch(() => []);
          }

          // Keep existing DB schemas in sync with the latest pack schema.
          for (const appDb of appDbs) {
            const def = pack.databases.find((d) => d.id === appDb.packDbId);
            if (!def) continue;
            const expectedSchema = def.properties as unknown as Record<string, unknown>[];
            const schemaVersion = ((appDb as unknown as { schemaVersion?: number }).schemaVersion ?? 1);
            const needsSchemaUpdate =
              JSON.stringify(appDb.propertiesSchema) !== JSON.stringify(expectedSchema) ||
              appDb.name !== def.name ||
              schemaVersion !== packRow.version;
            if (!needsSchemaUpdate) continue;
            await updateAppDatabaseSchema(appDb.id, {
              name: def.name,
              schemaVersion: packRow.version,
              propertiesSchema: expectedSchema,
            }).catch(() => null);
          }
          appDbs = await listAppDatabasesByWorkspace(workspace.id).catch(() => []);

          for (const appDb of appDbs) {
            const appRowsPlusOne = await listAppRowsByDatabase(appDb.id, { limit: 51 }).catch(() => []);
            const hasMore = appRowsPlusOne.length > 50;
            const appRows = hasMore ? appRowsPlusOne.slice(0, 50) : appRowsPlusOne;

            const packDbDef = pack.databases.find((d) => d.id === appDb.packDbId);
            const packPropsMap = new Map<string, { options?: Array<{ name: string } | string>; format?: string }>(
              ((packDbDef?.properties ?? []) as Array<{ name: string; options?: Array<{ name: string } | string>; format?: string }>).map((p) => [p.name, p])
            );
            const propertiesSchema = appDb.propertiesSchema as Array<{ name: string; type: string }>;

            databases.push({
              notionId: appDb.id,
              nicheId: pack.id,
              nicheName: pack.name,
              dbId: appDb.packDbId,
              dbName: appDb.name,
              icon: packDbDef?.icon ?? null,
              properties: propertiesSchema.map((p) => {
                const fresh = packPropsMap.get(p.name);
                const opts = fresh?.options ?? (p as { options?: Array<{ name: string } | string> }).options;
                const fmt = fresh?.format ?? (p as { format?: string }).format;
                return {
                  id: p.name,
                  name: p.name,
                  type: p.type,
                  ...(Array.isArray(opts) ? { options: opts.map((o) => typeof o === "string" ? o : o.name) } : {}),
                  ...(fmt !== undefined ? { format: fmt } : {}),
                };
              }),
              rows: appRows.map((r) => ({
                pageId: r.id,
                properties: r.properties as Record<string, string | number | boolean | null>,
              })),
              hasMore,
            });
          }
        } catch {
          // Keep other workspaces visible even if one workspace is broken.
          continue;
        }
      }

      // If everything was empty due drift, retry a default provision once.
      if (databases.length === 0) {
        await maybeProvisionDefaultAppWorkspace(userId);
        const retriedWorkspaces = await listAppWorkspacesByUser(userId).catch(() => []);
        for (const workspace of retriedWorkspaces) {
          const packRow = await getNichePack(workspace.nichePackId).catch(() => undefined);
          if (!packRow) continue;
          const pack = packRow.schemaSnapshot as unknown as NichePack;
          const appDbs = await listAppDatabasesByWorkspace(workspace.id).catch(() => []);
          for (const appDb of appDbs) {
            const appRowsPlusOne = await listAppRowsByDatabase(appDb.id, { limit: 51 }).catch(() => []);
            const hasMore = appRowsPlusOne.length > 50;
            const appRows = hasMore ? appRowsPlusOne.slice(0, 50) : appRowsPlusOne;
            const packDbDef = pack.databases.find((d) => d.id === appDb.packDbId);
            const packPropsMap = new Map<string, { options?: Array<{ name: string } | string>; format?: string }>(
              ((packDbDef?.properties ?? []) as Array<{ name: string; options?: Array<{ name: string } | string>; format?: string }>).map((p) => [p.name, p])
            );
            const propertiesSchema = appDb.propertiesSchema as Array<{ name: string; type: string }>;
            databases.push({
              notionId: appDb.id,
              nicheId: pack.id,
              nicheName: pack.name,
              dbId: appDb.packDbId,
              dbName: appDb.name,
              icon: packDbDef?.icon ?? null,
              properties: propertiesSchema.map((p) => {
                const fresh = packPropsMap.get(p.name);
                const opts = fresh?.options ?? (p as { options?: Array<{ name: string } | string> }).options;
                const fmt = fresh?.format ?? (p as { format?: string }).format;
                return {
                  id: p.name,
                  name: p.name,
                  type: p.type,
                  ...(Array.isArray(opts) ? { options: opts.map((o) => typeof o === "string" ? o : o.name) } : {}),
                  ...(fmt !== undefined ? { format: fmt } : {}),
                };
              }),
              rows: appRows.map((r) => ({
                pageId: r.id,
                properties: r.properties as Record<string, string | number | boolean | null>,
              })),
              hasMore,
            });
          }
        }
      }
    } catch {
      return NextResponse.json({ databases: [] });
    }

    return NextResponse.json({
      databases,
      backend: "app",
      weddingCriteria,
    } satisfies WorkspaceResponse);
  }

  // ── Notion flow ──────────────────────────────────────────────────────────
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

  return NextResponse.json({
    databases,
    backend: "notion",
    weddingCriteria,
  } satisfies WorkspaceResponse);
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

  // ── In-app flow ──────────────────────────────────────────────────────────
  if (!notionToken) {
    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workspace = await getAppWorkspaceForDatabase(parsed.data.databaseId).catch(() => undefined);
    if (!workspace || workspace.userId !== userEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    try {
      const row = await createAppRow({
        id: crypto.randomUUID(),
        databaseId: parsed.data.databaseId,
        properties: parsed.data.properties,
      });
      return NextResponse.json({ pageId: row.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Create failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // ── Notion flow ──────────────────────────────────────────────────────────
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
