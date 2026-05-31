import { notFound, redirect } from "next/navigation";
import {
  getNichePack,
  getUserCriteria,
  getLatestAppWorkspaceByNiche,
  createAppWorkspace,
  createAppDatabase,
  updateAppWorkspaceStatus,
} from "@niche-factory/db";
import type { NichePack } from "@niche-factory/schema";
import { SetupForm } from "./setup-form.js";
import { auth } from "@/auth";
import { resolveNotionToken } from "@/lib/resolve-notion-token";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ nicheId: string }>;
}) {
  const { nicheId } = await params;
  const row = await getNichePack(nicheId).catch(() => undefined);
  const name = row ? (row.name ?? "Set Up Your Workspace") : "Set Up Your Workspace";
  return { title: `Set up ${name} — Niche Factory` };
}

export default async function SetupPage({
  params,
}: {
  params: Promise<{ nicheId: string }>;
}) {
  const { nicheId } = await params;
  const packRow = await getNichePack(nicheId).catch(() => undefined);
  if (!packRow) notFound();

  const pack = packRow.schemaSnapshot as unknown as NichePack;

  const session = await auth();
  const userEmail = session?.user?.email;
  const sessionNotionToken = (session as unknown as Record<string, unknown> | null)?.["notionToken"] as string | undefined;
  const notionToken = await resolveNotionToken(userEmail, sessionNotionToken);
  const isInApp = !notionToken;

  if (userEmail && isInApp) {
    const hasOnboardingQuestions =
      Array.isArray(pack.onboardingQuestions) && pack.onboardingQuestions.length > 0;

    const [existingCriteria, existingWorkspace] = await Promise.all([
      getUserCriteria(userEmail, nicheId).catch(() => undefined),
      getLatestAppWorkspaceByNiche(userEmail, nicheId).catch(() => undefined),
    ]);

    const hasCriteria = !!existingCriteria;

    // Already fully set up — send straight to workspace.
    if (existingWorkspace && hasCriteria) {
      redirect(`/members/workspace?nicheId=${encodeURIComponent(nicheId)}`);
    }

    // Workspace exists but criteria is missing — show the form to collect
    // criteria only (no re-deploy needed).
    if (existingWorkspace && !hasCriteria) {
      return <SetupForm pack={pack} isInApp={isInApp} criteriaOnly nicheId={nicheId} />;
    }

    // Criteria already collected (e.g. from signup popup) but no workspace yet.
    // Auto-deploy without showing the form again.
    if (existingCriteria) {
      try {
        const workspaceId = randomUUID();
        await createAppWorkspace({
          id: workspaceId,
          userId: userEmail,
          nichePackId: nicheId,
          name: pack.name,
          databaseIdMap: {},
          status: "in_progress",
          createdAt: new Date(),
        });

        const databaseIdMap: Record<string, string> = {};
        const start = Date.now();

        for (const db of pack.databases) {
          const dbId = randomUUID();
          await createAppDatabase({
            id: dbId,
            workspaceId,
            packDbId: db.id,
            name: db.name,
            propertiesSchema: db.properties as Record<string, unknown>[],
            createdAt: new Date(),
          });
          databaseIdMap[db.id] = dbId;
        }

        await updateAppWorkspaceStatus(workspaceId, {
          status: "success",
          durationMs: Date.now() - start,
          databaseIdMap,
        });
      } catch {
        // If auto-deploy fails, fall through to show the form so the user
        // can try manually via the normal deploy flow.
      }

      // Re-check — if deploy succeeded, go to workspace. If it failed, show form.
      const freshWorkspace = await getLatestAppWorkspaceByNiche(userEmail, nicheId).catch(() => undefined);
      if (freshWorkspace) {
        redirect(`/members/workspace?nicheId=${encodeURIComponent(nicheId)}`);
      }
    }
  }

  return <SetupForm pack={pack} isInApp={isInApp} nicheId={nicheId} />;
}
