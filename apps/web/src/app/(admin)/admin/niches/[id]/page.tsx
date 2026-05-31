import { notFound } from "next/navigation";
import Link from "next/link";
import { getNichePack } from "@niche-factory/db";
import { NichePackSchema } from "@niche-factory/schema";
import { NicheEditor } from "@/components/editor/niche-editor";

export const dynamic = "force-dynamic";

export default async function AdminNicheEditorPage({
  params,
}: {
  params: { id: string };
}) {
  const row = await getNichePack(params.id);
  if (row === undefined) notFound();

  const pack = NichePackSchema.parse(row.schemaSnapshot);

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/40 text-sm">
        <span className="text-muted-foreground">Niche:</span>
        <span className="font-medium">{pack.name}</span>
        <span className="text-muted-foreground">·</span>
        <Link
          href={`/admin/niches/${params.id}/onboarding` as never}
          className="text-primary hover:underline font-medium"
        >
          Onboarding Questions →
        </Link>
      </div>
      <NicheEditor initialPack={pack} />
    </>
  );
}
