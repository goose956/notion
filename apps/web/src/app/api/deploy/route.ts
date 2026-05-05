import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { NichePackSchema } from "@niche-factory/schema";
import { deploy } from "@niche-factory/deployer";
import { NotionApiClient } from "@niche-factory/notion-client";
import { createDeploy, updateDeployStatus, upsertUserCriteria } from "@niche-factory/db";
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
    (session as Record<string, unknown> | null)?.["notionToken"] as string | undefined ??
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

  const deployId = randomUUID();
  await createDeploy({
    id: deployId,
    nichePackId: input.data.pack.id,
    notionParentPageId: input.data.parentPageId,
    databaseIdMap: {},
    status: "in_progress",
  });

  const client = new NotionApiClient({ auth: notionToken });

  let result;
  try {
    result = await deploy(input.data.pack, input.data.parentPageId, client);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Deploy failed";
    await updateDeployStatus(deployId, { status: "failed", errorMessage: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }

  await updateDeployStatus(deployId, {
    status: "success",
    durationMs: result.durationMs,
  });

  // Persist user criteria so sync runs can reload them without re-asking
  const notionUserId = (session as Record<string, unknown> | null)?.["notionUserId"];
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
