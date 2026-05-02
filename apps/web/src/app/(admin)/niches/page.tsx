import Link from "next/link";
import { listNichePacks } from "@niche-factory/db";
import type { NichePackRow } from "@niche-factory/db";

export const dynamic = "force-dynamic";

export default async function NichesPage() {
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
          <h1 className="text-2xl font-bold tracking-tight">Niche Packs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage your Notion niche packs
          </p>
        </div>
        <Link
          href="/niches/new"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-9 px-4 py-2 hover:bg-primary/90 transition-colors"
        >
          + New Niche Pack
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
            href="/niches/new"
            className="text-sm font-medium underline underline-offset-4"
          >
            Create your first niche pack
          </Link>
        </div>
      )}

      {rows.length > 0 && (
        <div className="rounded-lg border divide-y">
          {rows.map((row) => (
            <NichePackRow key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function NichePackRow({ row }: { row: NichePackRow }) {
  const updatedAt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(row.updatedAt));

  return (
    <Link
      href={`/niches/${row.id}`}
      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors group"
    >
      <div>
        <p className="font-medium text-sm group-hover:underline">{row.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{row.id}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">v{row.version}</p>
        <p className="text-xs text-muted-foreground">Updated {updatedAt}</p>
      </div>
    </Link>
  );
}
