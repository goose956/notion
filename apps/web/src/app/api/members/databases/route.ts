import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listNichePacks, getLatestDeployByNiche } from "@niche-factory/db";
import type { NichePack } from "@niche-factory/schema";

export interface DeployedDatabase {
  nicheId: string;
  nicheName: string;
  dbId: string;
  dbName: string;
  notionId: string;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const databases: DeployedDatabase[] = [];

  try {
    const packs = await listNichePacks();
    for (const packRow of packs) {
      const deploy = await getLatestDeployByNiche(packRow.id);
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
    }
  } catch {
    // Return empty list if DB unavailable
  }

  return NextResponse.json({ databases });
}
