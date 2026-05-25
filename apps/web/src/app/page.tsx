import Link from "next/link";
import { listTemplates } from "@niche-factory/db";
import type { TemplateRow } from "@niche-factory/db";
import { slugifyTemplateCategory } from "@/lib/template-categories";
import { ArrowRight, Compass, Sparkles, Workflow, Zap, Bot, Database } from "lucide-react";

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

      {/* Site header */}
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold text-base tracking-tight">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/s-logo.png" alt="Stridivo" className="h-7 w-auto" />
            Stridivo.com
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground h-8 px-4 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Get started free
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.16),transparent_45%),radial-gradient(circle_at_80%_0%,hsl(var(--foreground)/0.08),transparent_38%)]" />
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/8 px-3 py-1 text-xs font-medium text-primary shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Niche Workflow Template Directory
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            Discover Workflows That Solve Specific Niche Problems
          </h1>
          <p className="mt-4 max-w-2xl text-base md:text-lg text-muted-foreground">
            Browse template systems built around real-world jobs-to-be-done — from creator operations to local lead generation. Deploy a full database in seconds.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/templates"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground h-10 px-5 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Browse Templates
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-accent text-accent-foreground h-10 px-5 text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <Zap className="h-4 w-4" />
              Get started free
            </Link>
          </div>

          {categoryLinks.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {categoryLinks.map((category) => (
                <Link
                  key={category}
                  href={`/templates/category/${slugifyTemplateCategory(category)}`}
                  className="rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
                >
                  {category}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
            <FeaturePill icon={<Compass className="h-4 w-4 text-primary" />} label="Niche-specific systems" />
            <FeaturePill icon={<Bot className="h-4 w-4 text-primary" />} label="AI research assistant" />
            <FeaturePill icon={<Database className="h-4 w-4 text-primary" />} label="Deploy in 30 seconds" />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-10 md:py-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Template Gallery</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {liveTemplates.length > 0
                ? "Browse published workflow systems — click any card to preview and deploy."
                : "Explore niche workflow systems and deploy the right one in seconds."}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="rounded-full border border-primary/25 bg-primary/10 text-primary px-2.5 py-1 font-medium">Trending</span>
            <span className="rounded-full border border-accent/25 bg-accent/10 text-accent px-2.5 py-1 font-medium">Top Rated</span>
            <span className="rounded-full border border-green-300 bg-green-50 text-green-700 px-2.5 py-1 font-medium">New</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {galleryItems.map((workflow) => {
            const card = (
              <article className="group surface-card p-5 flex flex-col gap-4 hover:shadow-lg hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${categoryColor(workflow.category)}`}>
                    {workflow.category}
                  </span>
                  <span className="text-xs text-muted-foreground">{workflow.metric}</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold leading-snug group-hover:underline capitalize">
                    {workflow.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {workflow.painPoint}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {workflow.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-xs px-2 py-0.5 rounded-full border ${categoryColor(workflow.category)}`}
                    >
                      #{tag}
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

({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="surface-card px-3 py-2 text-sm flex items-center gap-2 bg-card/80">
      <span className="icon-badge">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
