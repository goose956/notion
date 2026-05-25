import Link from "next/link";
import { listTemplates } from "@niche-factory/db";
import type { TemplateRow } from "@niche-factory/db";
import { TEMPLATE_CATEGORIES, slugifyTemplateCategory } from "@/lib/template-categories";
import { Search, Sparkles } from "lucide-react";

function categoryColor(cat: string): string {
  const c = cat.toLowerCase();
  if (c.includes("finance") || c.includes("forex") || c.includes("invest")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (c.includes("real estate") || c.includes("property")) return "bg-sky-50 text-sky-700 border-sky-200";
  if (c.includes("creator") || c.includes("content") || c.includes("newsletter")) return "bg-violet-50 text-violet-700 border-violet-200";
  if (c.includes("local") || c.includes("lead") || c.includes("seo")) return "bg-orange-50 text-orange-700 border-orange-200";
  if (c.includes("ops") || c.includes("operation") || c.includes("agency")) return "bg-slate-100 text-slate-700 border-slate-300";
  if (c.includes("wedding") || c.includes("event") || c.includes("planner")) return "bg-pink-50 text-pink-700 border-pink-200";
  if (c.includes("ecommerce") || c.includes("shopify") || c.includes("retail")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (c.includes("health") || c.includes("fitness") || c.includes("wellness")) return "bg-teal-50 text-teal-700 border-teal-200";
  return "bg-primary/8 text-primary border-primary/20";
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Niche Workflow Templates | Stridivo.com",
  description:
    "Browse ready-made workflow templates for every niche. Find the exact system that solves your workflow problem.",
};

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>;
}) {
  const { search, category } = await searchParams;

  let rows: TemplateRow[] = [];
  try {
    rows = await listTemplates({
      publishedOnly: true,
      ...(search ? { search } : {}),
      ...(category ? { category } : {}),
    });
  } catch {
    // DB unavailable — show empty state
  }

  const categories = Array.from(new Set(rows.map((r) => r.category).filter(Boolean)));
  const categoryMenu = TEMPLATE_CATEGORIES.filter((category) => category === "Other" || categories.includes(category));

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="border-b bg-muted/30 px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-sm mb-4">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Curated by niche and workflow goal
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          Niche Workflow Templates
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Ready-made workflow systems for every niche — find the exact template that solves your problem and deploy it in seconds.
        </p>
        <div className="mt-6 text-sm text-muted-foreground">Browse by category</div>
        {categories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-4xl mx-auto">
            {categoryMenu.map((cat) => (
              <Link
                key={cat}
                href={`/templates/category/${slugifyTemplateCategory(cat)}`}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors hover:opacity-80 ${categoryColor(cat)}`}
              >
                {cat}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Search + filter */}
      <section className="border-b px-6 py-4">
        <form className="max-w-3xl mx-auto flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Search templates…"
              className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          {categories.length > 0 && (
            <select
              name="category"
              defaultValue={category}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
          {(search ?? category) && (
            <Link
              href="/templates"
              className="h-9 px-4 rounded-md border text-sm font-medium flex items-center hover:bg-muted transition-colors"
            >
              Clear
            </Link>
          )}
        </form>
      </section>

      {/* Grid */}
      <section className="px-6 py-10 max-w-6xl mx-auto">
        {rows.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            {search ?? category
              ? "No templates found for that search."
              : "No templates published yet — check back soon."}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {rows.length} template{rows.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rows.map((t) => (
                <TemplateCard key={t.id} template={t} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function TemplateCard({ template: t }: { template: TemplateRow }) {
  const tags = (t.tags as string[]) ?? [];
  return (
    <Link
      href={`/templates/${t.slug}`}
      className="group flex flex-col surface-card hover:shadow-lg transition-shadow p-5 gap-3"
    >
      {t.category && (
        <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border inline-flex items-center ${categoryColor(t.category)}`}>
          {t.category}
        </span>
      )}
      <h2 className="font-semibold text-base group-hover:underline leading-snug capitalize">
        {t.title}
      </h2>
      <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
        {t.tagline}
      </p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-auto pt-2">
          {tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 rounded-full border ${t.category ? categoryColor(t.category) : "bg-muted text-muted-foreground"}`}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
