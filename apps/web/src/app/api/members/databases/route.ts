import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listNichePacks, getLatestDeployByNiche, getUserCriteria, getLatestAppWorkspaceByNiche } from "@niche-factory/db";
import type { NichePack } from "@niche-factory/schema";

export interface DeployedDatabase {
  nicheId: string;
  nicheName: string;
  dbId: string;
  dbName: string;
  notionId: string;
}

export interface NicheCriteria {
  nicheId: string;
  criteria: Record<string, unknown>;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notionToken = (session as unknown as Record<string, unknown>)["notionToken"] as
    | string
    | undefined;
  const notionUserId = (session as unknown as Record<string, unknown>)["notionUserId"] as string | undefined;
  const userEmail = session.user.email;
  const isInApp = !notionToken;
  const databases: DeployedDatabase[] = [];
  const criteria: NicheCriteria[] = [];

  try {
    const packs = await listNichePacks();
    for (const packRow of packs) {
      let dbMap: Record<string, string> | undefined;

      if (notionToken && notionUserId) {
        const deployRow = await getLatestDeployByNiche(packRow.id, notionUserId);
        if (deployRow === undefined) continue;
        dbMap = deployRow.databaseIdMap as Record<string, string> | null | undefined ?? undefined;
      } else if (userEmail) {
        const workspaceRow = await getLatestAppWorkspaceByNiche(userEmail, packRow.id);
        if (workspaceRow === undefined) continue;
        dbMap = workspaceRow.databaseIdMap as Record<string, string> | null | undefined ?? undefined;
      }

      if (!dbMap || Object.keys(dbMap).length === 0) continue;

      const pack = packRow.schemaSnapshot as unknown as NichePack;
      for (const db of pack.databases) {
        const dbId = dbMap[db.id];
        if (typeof dbId === "string") {
          databases.push({
            nicheId: pack.id,
            nicheName: pack.name,
            dbId: db.id,
            dbName: db.name,
            notionId: dbId, // Notion DB ID for Notion users; appDatabase.id for in-app users
          });
        }
      }

      // Criteria keyed by notionUserId for Notion users, email for in-app users
      const criteriaKey = notionUserId ?? userEmail;
      if (criteriaKey) {
        const crit = await getUserCriteria(criteriaKey, packRow.id).catch(() => undefined);
        if (crit) {
          criteria.push({ nicheId: packRow.id, criteria: crit.criteria as Record<string, unknown> });
        }
      }
    }
  } catch {
    // Return empty list if DB unavailable
  }

  return NextResponse.json({ databases, criteria, backend: isInApp ? "app" : "notion" });
}

