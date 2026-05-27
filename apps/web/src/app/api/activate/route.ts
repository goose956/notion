import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  redeemActivationLink,
  getActivationLink,
  getNichePack,
  getUserCriteria,
  getLatestAppWorkspaceByNiche,
  createAppWorkspace,
  createAppDatabase,
  updateAppWorkspaceStatus,
} from "@niche-factory/db";
import type { NichePack } from "@niche-factory/schema";
import { randomUUID } from "node:crypto";

const BodySchema = z.object({
  token: z.string().uuid(),
});

/** POST /api/activate — redeem an activation link for the currently logged-in user. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email;
  const userId = session.user.email; // email is the userId for in-app (credentials) users

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { token } = parsed.data;

  // Check the link exists and is available before trying to redeem
  const link = await getActivationLink(token);
  if (!link) {
    return NextResponse.json({ error: "Invalid activation link" }, { status: 404 });
  }
  const now = new Date();
  if (link.revoked) {
    return NextResponse.json({ error: "This activation link has been revoked" }, { status: 409 });
  }
  if (link.expiresAt && link.expiresAt < now) {
    return NextResponse.json({ error: "This activation link has expired" }, { status: 409 });
  }
  if (link.maxUses != null && link.uses >= link.maxUses) {
    return NextResponse.json({ error: "This activation link has reached its maximum uses" }, { status: 409 });
  }

  // Redeem — this atomically marks the link used and sets credits
  let redeemedLink;
  try {
    redeemedLink = await redeemActivationLink(token, email);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Redemption failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Provision the workspace for this niche pack (if not already provisioned)
  const { nichePackId } = redeemedLink;
  await provisionIfNeeded(userId, nichePackId);

  // Let the client know if criteria already exist so it can skip the onboarding form
  const existingCriteria = await getUserCriteria(userId, nichePackId).catch(() => undefined);
  const hasCriteria = existingCriteria != null && Object.keys(existingCriteria.criteria ?? {}).length > 0;

  return NextResponse.json({
    ok: true,
    nichePackId,
    credits: redeemedLink.credits,
    label: redeemedLink.label,
    hasCriteria,
  });
}

/** Provision a workspace for the user + nichePackId unless one already exists. */
async function provisionIfNeeded(userId: string, nichePackId: string): Promise<void> {
  // If user already has a workspace for this niche, skip
  const existing = await getLatestAppWorkspaceByNiche(userId, nichePackId).catch(() => undefined);
  if (existing) return;

  const packRow = await getNichePack(nichePackId).catch(() => undefined);
  if (!packRow) return;

  const pack = packRow.schemaSnapshot as unknown as NichePack;

  // If the niche has onboarding questions we can't answer here, still provision
  // with an empty-criteria workspace so the user lands in the members area.
  const criteria = await getUserCriteria(userId, nichePackId).catch(() => undefined);
  // Only auto-provision if either: no onboarding questions OR criteria already set
  // For activation flow we always provision so the workspace is immediately accessible.
  // The onboarding form is shown in ActivateClient and criteria saved separately.

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
        schemaVersion: packRow.version,
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
    const message = err instanceof Error ? err.message : "Workspace provisioning failed";
    await updateAppWorkspaceStatus(workspaceId, {
      status: "failed",
      errorMessage: message,
    }).catch(() => null);
    // Don't throw — credits were already granted; workspace can be re-provisioned later
  }
}
