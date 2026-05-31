import Link from "next/link";
import { listNichePacks } from "@niche-factory/db";
import type { NichePackRow } from "@niche-factory/db";
import { ArrowRight, Blocks, ClipboardList, Plus, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminNichesPage() {
  let rows: NichePackRow[] = [];
  let dbError: string | undefined;

  try {
    rows = await listNichePacks();
  } catch (err) {
    dbError =
      err instanceof Error ? err.message : "Could not connect to database";
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground bg-background/80 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Niche Pack Control
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Niche Packs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage your Notion niche packs
          </p>
        </div>
        <Link
          href="/admin/niches/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground h-9 px-4 py-2 hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Niche Pack
        </Link>
      </div>

      {dbError !== undefined && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-4 py-3 mb-4">
          Database unavailable: {dbError}
        </div>
      )}

      {rows.length === 0 && dbError === undefined && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm mb-3">
            No niche packs yet.
          </p>
          <Link
            href="/admin/niches/new"
            className="text-sm font-medium underline underline-offset-4"
          >
            Create your first niche pack
          </Link>
        </div>
      )}

      {rows.length > 0 && (
        <div className="surface-card divide-y overflow-hidden">
          {rows.map((row) => (
            <NichePackRowCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function NichePackRowCard({ row }: { row: NichePackRow }) {
  const updatedAt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(row.updatedAt));

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors group">
      <div>
        <p className="font-medium text-sm inline-flex items-center gap-1.5">
          <span className="icon-badge h-5 w-5"><Blocks className="h-3 w-3" /></span>
          {row.name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{row.id}</p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/niches/${row.id}/onboarding` as never}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Onboarding
        </Link>
        <Link
          href={`/admin/niches/${row.id}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>v{row.version}</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
