import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { NichePackSchema } from "@niche-factory/schema";
import { deploy } from "@niche-factory/deployer";
import { NotionApiClient } from "@niche-factory/notion-client";
import { createDeploy, updateDeployStatus, upsertUserCriteria, upsertNichePack } from "@niche-factory/db";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";

const DeployRequestSchema = z.object({
  pack: NichePackSchema,
  parentPageId: z.string().min(1),
  onboardingAnswers: z.record(z.string(), z.unknown()).optional(),
});

// POST /api/deploy — push a niche pack to a Notion workspace
export async function POST(request: NextRequest) {
  const session = await auth();
  const notionToken =
    (session as unknown as Record<string, unknown> | null)?.["notionToken"] as string | undefined ??
    process.env["NOTION_TOKEN"];

  if (!notionToken) {
    return NextResponse.json(
      { error: "Not authenticated — sign in with Notion first" },
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

  const notionUserId = (session as unknown as Record<string, unknown> | null)?.["notionUserId"];

  const deployId = randomUUID();

  // Ensure the niche pack row exists so the FK on deploys is satisfied.
  // (The pack may not be in the DB if it came from a local file or AI draft.)
  try {
    await upsertNichePack(input.data.pack);
  } catch (err) {
    console.error("[POST /api/deploy] upsertNichePack failed:", err);
    // Non-fatal: proceed anyway; if the FK fails createDeploy will surface it.
  }

  try {
    await createDeploy({
      id: deployId,
      nichePackId: input.data.pack.id,
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
    result = await deploy(input.data.pack, input.data.parentPageId, client);
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
    // Deploy succeeded — don't fail the response just because the audit update failed
  }

  // Persist user criteria so sync runs can reload them without re-asking
  const answers = input.data.onboardingAnswers;
  if (typeof notionUserId === "string" && answers !== undefined && Object.keys(answers).length > 0) {
    try {
      await upsertUserCriteria(notionUserId, input.data.pack.id, answers);
    } catch (err) {
      // Database unavailable — deploy succeeded, but we couldn't save criteria
      // This is non-fatal; the user can re-enter answers on next deploy
      const msg = err instanceof Error ? err.message : "Could not save criteria";
      console.warn(`[POST /api/deploy] Criteria save failed (non-fatal): ${msg}`);
    }
  }

  return NextResponse.json({ result, deployId });
}
