import Link from "next/link";
import { listTemplates } from "@niche-factory/db";
import type { TemplateRow } from "@niche-factory/db";

export const dynamic = "force-dynamic";

export default async function AdminTemplatesPage() {
  let rows: TemplateRow[] = [];
  let dbError: string | undefined;

  try {
    rows = await listTemplates();
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Database error";
  }

  const publishedCount = rows.filter((r) => r.published).length;
  const draftCount = rows.length - publishedCount;
  const totalViews = rows.reduce((sum, r) => sum + r.viewCount, 0);
  const totalClicks = rows.reduce((sum, r) => sum + r.clickCount, 0);
  const overallCtr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your Notion workflow template directory pages
          </p>
        </div>
        <Link
          href="/admin/templates/new"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-9 px-4 py-2 hover:bg-primary/90 transition-colors"
        >
          + New Template
        </Link>
      </div>

      {dbError !== undefined && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-4 py-3 mb-4">
          Database unavailable: {dbError}
        </div>
      )}

      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatCard label="Total" value={String(rows.length)} />
          <StatCard label="Published" value={String(publishedCount)} />
          <StatCard label="Drafts" value={String(draftCount)} />
          <StatCard label="Views" value={totalViews.toLocaleString()} />
          <StatCard
            label="Clicks / CTR"
            value={`${totalClicks.toLocaleString()} / ${overallCtr.toFixed(1)}%`}
          />
        </div>
      )}

      {rows.length === 0 && dbError === undefined && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm mb-3">No templates yet.</p>
          <Link
            href="/admin/templates/new"
            className="text-sm font-medium underline underline-offset-4"
          >
            Create your first template
          </Link>
        </div>
      )}

      {rows.length > 0 && (
        <div className="rounded-lg border divide-y">
          {rows.map((row) => (
            <TemplateListRow key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateListRow({ row }: { row: TemplateRow }) {
  const ctr = row.viewCount > 0 ? (row.clickCount / row.viewCount) * 100 : 0;

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{row.title}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              row.published
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {row.published ? "Published" : "Draft"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">/templates/{row.slug}</p>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
        <span>{row.viewCount} views</span>
        <span>{row.clickCount} clicks</span>
        <span>{ctr.toFixed(1)}% ctr</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/templates/${row.slug}`}
          target="_blank"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View ↗
        </Link>
        <Link
          href={`/admin/templates/${row.id}/edit`}
          className="inline-flex items-center justify-center rounded-md border text-xs font-medium h-7 px-3 hover:bg-muted transition-colors"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold leading-tight mt-1">{value}</p>
    </div>
  );
}
