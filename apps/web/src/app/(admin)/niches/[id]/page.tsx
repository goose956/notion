import { notFound } from "next/navigation";
import { getNichePack } from "@niche-factory/db";
import { NichePackSchema } from "@niche-factory/schema";
import { NicheEditor } from "@/components/editor/niche-editor";

export const dynamic = "force-dynamic";

export default async function NicheEditorPage({
  params,
}: {
  params: { id: string };
}) {
  const row = await getNichePack(params.id);
  if (row === undefined) notFound();

  const pack = NichePackSchema.parse(row.schemaSnapshot);

  return <NicheEditor initialPack={pack} />;
}
