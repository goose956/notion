import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listNichePacks, getLatestDeployByNiche, getUserCriteria } from "@niche-factory/db";
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

  const notionUserId = (session as unknown as Record<string, unknown>)["notionUserId"] as string | undefined;
  const databases: DeployedDatabase[] = [];
  const criteria: NicheCriteria[] = [];

  try {
    const packs = await listNichePacks();
    for (const packRow of packs) {
      const deploy = await getLatestDeployByNiche(packRow.id, notionUserId);
      if (deploy === undefined) continue;
      const dbMap = deploy.databaseIdMap as Record<string, string> | null | undefined;
      if (!dbMap || Object.keys(dbMap).length === 0) continue;
      const pack = packRow.schemaSnapshot as unknown as NichePack;
      for (const db of pack.databases) {
        const notionId = dbMap[db.id];
        if (typeof notionId === "string") {
          databases.push({
            nicheId: pack.id,
            nicheName: pack.name,
            dbId: db.id,
            dbName: db.name,
            notionId,
          });
        }
      }
      // Fetch user criteria for this niche (location, preferences, etc.)
      if (notionUserId) {
        const crit = await getUserCriteria(notionUserId, packRow.id).catch(() => undefined);
        if (crit) {
          criteria.push({ nicheId: pack.id, criteria: crit.criteria as Record<string, unknown> });
        }
      }
    }
  } catch {
    // Return empty list if DB unavailable
  }

  return NextResponse.json({ databases, criteria });
}
