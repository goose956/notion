import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { NichePackSchema } from "@niche-factory/schema";
import { deploy } from "@niche-factory/deployer";
import { NotionApiClient } from "@niche-factory/notion-client";
import {
  createDeploy,
  updateDeployStatus,
  upsertUserCriteria,
  upsertNichePack,
  createAppWorkspace,
  updateAppWorkspaceStatus,
  createAppDatabase,
} from "@niche-factory/db";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { resolveNotionToken } from "@/lib/resolve-notion-token";

const DeployRequestSchema = z.object({
  pack: NichePackSchema,
  // Required for Notion deploys; omit for in-app deploys
  parentPageId: z.string().min(1).optional(),
  onboardingAnswers: z.record(z.string(), z.unknown()).optional(),
});

// POST /api/deploy — push a niche pack to a Notion workspace OR an in-app workspace
export async function POST(request: NextRequest) {
  const session = await auth();
  const userEmail = session?.user?.email;
  const sessionNotionToken = (session as unknown as Record<string, unknown> | null)?.["notionToken"] as string | undefined;
  const notionToken = await resolveNotionToken(userEmail, sessionNotionToken);

  // Must be authenticated by either Notion OAuth or email credentials
  if (!notionToken && !userEmail) {
    return NextResponse.json(
      { error: "Not authenticated — sign in first" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = DeployRequestSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: input.error.issues },
      { status: 422 },
    );
  }

  const { pack, onboardingAnswers: answers } = input.data;
  const notionUserId = (session as unknown as Record<string, unknown> | null)?.["notionUserId"];

  // Ensure the niche pack row exists so FK constraints are satisfied.
  try {
    await upsertNichePack(pack);
  } catch (err) {
    console.error("[POST /api/deploy] upsertNichePack failed:", err);
  }

  // ── In-App deploy (no Notion token) ────────────────────────────────────────
  if (!notionToken) {
    const userId = userEmail!;
    const workspaceId = randomUUID();

    try {
      await createAppWorkspace({
        id: workspaceId,
        userId,
        nichePackId: pack.id,
        name: pack.name,
        databaseIdMap: {},
        status: "in_progress",
        createdAt: new Date(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create workspace";
      console.error("[POST /api/deploy] createAppWorkspace failed:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const databaseIds: Record<string, string> = {};
    const start = Date.now();
    try {
      for (const db of pack.databases) {
        const dbId = randomUUID();
        await createAppDatabase({
          id: dbId,
          workspaceId,
          packDbId: db.id,
          name: db.name,
          propertiesSchema: db.properties as unknown as Record<string, unknown>[],
          createdAt: new Date(),
        });
        databaseIds[db.id] = dbId;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create databases";
      console.error("[POST /api/deploy] createAppDatabase failed:", message);
      await updateAppWorkspaceStatus(workspaceId, { status: "failed", errorMessage: message }).catch(() => null);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const durationMs = Date.now() - start;
    await updateAppWorkspaceStatus(workspaceId, { status: "success", durationMs, databaseIdMap: databaseIds }).catch((err) => {
      console.error("[POST /api/deploy] updateAppWorkspaceStatus failed:", err);
    });

    if (answers && Object.keys(answers).length > 0) {
      await upsertUserCriteria(userId, pack.id, answers).catch((err) => {
        console.warn("[POST /api/deploy] upsertUserCriteria (in-app) failed (non-fatal):", err);
      });
    }

    return NextResponse.json({
      result: { databaseIds, workspaceId, durationMs },
      deployId: workspaceId,
      backend: "app",
    });
  }

  // ── Notion deploy ───────────────────────────────────────────────────────────
  if (!input.data.parentPageId) {
    return NextResponse.json(
      { error: "parentPageId is required for Notion deploys" },
      { status: 422 },
    );
  }

  const deployId = randomUUID();

  try {
    await createDeploy({
      id: deployId,
      nichePackId: pack.id,
      notionParentPageId: input.data.parentPageId,
      notionUserId: typeof notionUserId === "string" ? notionUserId : null,
      databaseIdMap: {},
      status: "in_progress",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create deploy record";
    console.error("[POST /api/deploy] createDeploy failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const client = new NotionApiClient({ auth: notionToken });

  let result;
  try {
    result = await deploy(pack, input.data.parentPageId, client);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Deploy failed";
    console.error("[POST /api/deploy] deploy() failed:", message);
    try {
      await updateDeployStatus(deployId, { status: "failed", errorMessage: message });
    } catch (dbErr) {
      console.error("[POST /api/deploy] updateDeployStatus (failed) threw:", dbErr);
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }

  try {
    await updateDeployStatus(deployId, {
      status: "success",
      durationMs: result.durationMs,
      databaseIdMap: result.databaseIds,
    });
  } catch (err) {
    console.error("[POST /api/deploy] updateDeployStatus (success) threw:", err);
  }

  if (typeof notionUserId === "string" && answers !== undefined && Object.keys(answers).length > 0) {
    try {
      await upsertUserCriteria(notionUserId, pack.id, answers);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save criteria";
      console.warn(`[POST /api/deploy] Criteria save failed (non-fatal): ${msg}`);
    }
  }

  return NextResponse.json({ result, deployId, backend: "notion" });
}

