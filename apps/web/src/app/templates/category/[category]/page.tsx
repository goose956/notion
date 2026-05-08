import Link from "next/link";
import { notFound } from "next/navigation";
import { listTemplates, type TemplateRow } from "@niche-factory/db";
import { humanizeTemplateCategorySlug, slugifyTemplateCategory } from "@/lib/template-categories";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const categoryLabel = humanizeTemplateCategorySlug(category);
  return {
    title: `${categoryLabel} Notion Templates | Niche Factory`,
    description: `Browse Notion workflow templates in the ${categoryLabel} category.`,
    alternates: {
      canonical: `/templates/category/${category}`,
    },
  };
}

export default async function TemplateCategoryPage({ params }: Props) {
  const { category } = await params;

  let rows: TemplateRow[] = [];
  try {
    const all = await listTemplates({ publishedOnly: true });
    rows = all.filter((row) => slugifyTemplateCategory(row.category) === category);
  } catch {
    rows = [];
  }

  if (rows.length === 0) {
    notFound();
  }

  const categoryLabel = rows[0]?.category || humanizeTemplateCategorySlug(category);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-6 py-3 text-sm text-muted-foreground">
        <Link href="/templates" className="hover:text-foreground transition-colors">
          Templates
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{categoryLabel}</span>
      </div>

      <section className="border-b bg-muted/30 px-6 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          {categoryLabel} Templates
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Browse published Notion workflow templates in the {categoryLabel} category.
        </p>
      </section>

      <section className="px-6 py-10 max-w-6xl mx-auto">
        <p className="text-sm text-muted-foreground mb-6">
          {rows.length} template{rows.length !== 1 ? "s" : ""}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rows.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      </section>
    </div>
  );
}

function TemplateCard({ template: t }: { template: TemplateRow }) {
  const tags = (t.tags as string[]) ?? [];
  return (
    <Link
      href={`/templates/${t.slug}`}
      className="group flex flex-col rounded-lg border bg-card hover:shadow-md transition-shadow p-5 gap-3"
    >
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {t.category}
      </span>
      <h2 className="font-semibold text-base group-hover:underline leading-snug">
        {t.title}
      </h2>
      <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
        {t.problemStatement || t.tagline}
      </p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-auto pt-2">
          {tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
