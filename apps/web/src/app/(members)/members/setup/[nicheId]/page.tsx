import { notFound, redirect } from "next/navigation";
import { getNichePack, getUserCriteria, getLatestAppWorkspaceByNiche } from "@niche-factory/db";
import type { NichePack } from "@niche-factory/schema";
import { SetupForm } from "./setup-form.js";
import { auth } from "@/auth";
import { resolveNotionToken } from "@/lib/resolve-notion-token";

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

  // If the user already has criteria + a workspace for this niche, skip setup entirely.
  if (userEmail && isInApp) {
    const hasOnboardingQuestions =
      Array.isArray(pack.onboardingQuestions) && pack.onboardingQuestions.length > 0;

    if (hasOnboardingQuestions) {
      const [existingCriteria, existingWorkspace] = await Promise.all([
        getUserCriteria(userEmail, nicheId).catch(() => undefined),
        getLatestAppWorkspaceByNiche(userEmail, nicheId).catch(() => undefined),
      ]);

      if (existingCriteria && existingWorkspace) {
        redirect(`/members/workspace?nicheId=${encodeURIComponent(nicheId)}`);
      }
    } else {
      // No onboarding questions — if workspace already exists just go there.
      const existingWorkspace = await getLatestAppWorkspaceByNiche(userEmail, nicheId).catch(() => undefined);
      if (existingWorkspace) {
        redirect(`/members/workspace?nicheId=${encodeURIComponent(nicheId)}`);
      }
    }
  }

  return <SetupForm pack={pack} isInApp={isInApp} />;
}
