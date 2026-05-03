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
  const notionToken = process.env["NOTION_TOKEN"];
  if (!notionToken) {
    return NextResponse.json(
      { error: "NOTION_TOKEN is not configured on the server" },
      { status: 503 },
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
  const session = await auth();
  const notionUserId = (session as Record<string, unknown> | null)?.["notionUserId"];
  const answers = input.data.onboardingAnswers;
  if (typeof notionUserId === "string" && answers !== undefined && Object.keys(answers).length > 0) {
    await upsertUserCriteria(notionUserId, input.data.pack.id, answers);
  }

  return NextResponse.json({ result, deployId });
}
