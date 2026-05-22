import { notFound } from "next/navigation";
import { getNichePack } from "@niche-factory/db";
import type { NichePack } from "@niche-factory/schema";
import { SetupForm } from "./setup-form.js";
import { auth } from "@/auth";

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
  const notionToken = (session as unknown as Record<string, unknown> | null)?.["notionToken"] as string | undefined;
  const isInApp = !notionToken;

  return <SetupForm pack={pack} isInApp={isInApp} />;
}

