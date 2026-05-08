import Link from "next/link";
import { listTemplates } from "@niche-factory/db";
import type { TemplateRow } from "@niche-factory/db";
import { slugifyTemplateCategory } from "@/lib/template-categories";

interface GalleryCard {
  title: string;
  category: string;
  painPoint: string;
  tags: string[];
  metric: string;
  href?: `/templates/${string}`;
}

const dummyWorkflows: GalleryCard[] = [
  {
    title: "Track YouTube Videos for Forex Niche",
    category: "Finance",
    painPoint: "Stop losing high-signal trade videos across tabs, bookmarks, and notes.",
    tags: ["forex", "youtube", "research"],
    metric: "312 installs",
  },
  {
    title: "Local Plumber Lead Pipeline",
    category: "Local SEO",
    painPoint: "Capture Google Maps businesses and turn raw listings into qualified outreach leads.",
    tags: ["leads", "google maps", "outbound"],
    metric: "188 installs",
  },
  {
    title: "Creator Sponsorship CRM",
    category: "Creator Ops",
    painPoint: "Manage brand deals, follow-ups, and payout stages without spreadsheet chaos.",
    tags: ["crm", "creator", "sponsorships"],
    metric: "241 installs",
  },
  {
    title: "Airbnb Arbitrage Deal Scout",
    category: "Real Estate",
    painPoint: "Compare rental comps, occupancy assumptions, and landlord outreach in one flow.",
    tags: ["airbnb", "real estate", "deals"],
    metric: "154 installs",
  },
  {
    title: "Newsletter Content Mining Board",
    category: "Content",
    painPoint: "Turn scattered ideas into ranked newsletter angles with deadlines and owners.",
    tags: ["newsletter", "content", "editorial"],
    metric: "96 installs",
  },
  {
    title: "Agency Client Onboarding Hub",
    category: "Operations",
    painPoint: "Standardize intake forms, kickoff tasks, and handoff status across every new client.",
    tags: ["agency", "onboarding", "ops"],
    metric: "267 installs",
  },
];

export default async function HomePage() {
  let liveTemplates: TemplateRow[] = [];
  try {
    liveTemplates = await listTemplates({ publishedOnly: true });
  } catch {
    // Fall back to dummy cards if DB is unavailable.
  }

  const liveCards: GalleryCard[] = liveTemplates.slice(0, 9).map((template) => ({
    title: template.title,
    category: template.category || "Workflow",
    painPoint: template.problemStatement,
    tags: ((template.tags as string[]) ?? []).slice(0, 4),
    metric: `${template.viewCount.toLocaleString()} views`,
    href: `/templates/${template.slug}` as `/templates/${string}`,
  }));

  const TARGET_GALLERY_SIZE = 9;
  const dummyNeeded = Math.max(0, TARGET_GALLERY_SIZE - liveCards.length);
  const dummyCards = dummyWorkflows.slice(0, dummyNeeded);
  const galleryItems: GalleryCard[] = [...liveCards, ...dummyCards];
  const categoryLinks = Array.from(new Set(liveTemplates.map((template) => template.category).filter(Boolean)))
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.16),transparent_45%),radial-gradient(circle_at_80%_0%,hsl(var(--foreground)/0.08),transparent_38%)]" />
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="inline-flex items-center rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground">
            Notion Workflow Template Directory
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            Discover Workflows That Solve Specific Niche Problems
          </h1>
          <p className="mt-4 max-w-2xl text-base md:text-lg text-muted-foreground">
            Browse template systems built around real-world jobs-to-be-done, from creator operations to local lead generation.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/templates"
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-5 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Browse Live Templates
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-md border h-10 px-5 text-sm font-medium hover:bg-muted transition-colors"
            >
              Open Admin Panel
            </Link>
          </div>

          {categoryLinks.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {categoryLinks.map((category) => (
                <Link
                  key={category}
                  href={`/templates/category/${slugifyTemplateCategory(category)}`}
                  className="rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                >
                  {category}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-10 md:py-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Discovery Gallery</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {liveTemplates.length > 0
                ? "Live published templates from your directory, plus featured placeholders while your catalog grows."
                : "Dummy workflows for now. Replace these with your real packs as they are published."}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border px-2 py-1">Trending</span>
            <span className="rounded-full border px-2 py-1">Highest Conversion</span>
            <span className="rounded-full border px-2 py-1">New This Week</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {galleryItems.map((workflow) => {
            const card = (
              <article className="group rounded-xl border bg-card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {workflow.category}
                  </span>
                  <span className="text-xs text-muted-foreground">{workflow.metric}</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold leading-snug group-hover:underline">
                    {workflow.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {workflow.painPoint}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {workflow.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            );

            return workflow.href ? (
              <Link key={workflow.title} href={workflow.href} className="block">
                {card}
              </Link>
            ) : (
              <div key={workflow.title}>{card}</div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
