import Link from "next/link";
import { WORKFLOW_CATALOG } from "@/lib/workflow-catalog";
import { ArrowRight, Compass, Bot, Workflow, Sparkles } from "lucide-react";

const NICHE_CATEGORIES: Record<string, string> = {
  "wedding-planner":     "Wedding",
  "rainbow":             "Wedding",
  "neurodivergent-wedding": "Wedding",
  "project-manager":     "Productivity",
  "pinterest-poster":    "Creator",
  "content-creator":     "Creator",
  "neurodivergent":      "Wellness",
  "side-hustle":         "Business",
  "food-business":       "Business",
  "cake-business":       "Business",
  "etsy-shop":           "Ecommerce",
  "str-guidebook":       "Property",
  "author":              "Creative",
  "nail-tech":           "Beauty",
};

export default function HomePage() {
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
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground h-8 px-4 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.16),transparent_45%),radial-gradient(circle_at_80%_0%,hsl(var(--foreground)/0.08),transparent_38%)]" />
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/8 px-3 py-1 text-xs font-medium text-primary shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered done-for-you workflows
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            The AI does the work.<br />You make the decisions.
          </h1>
          <p className="mt-3 text-sm font-semibold text-primary tracking-wide uppercase">
            Start it. AI finishes it.
          </p>
          <p className="mt-4 max-w-2xl text-base md:text-lg text-muted-foreground">
            Pick your niche. Stridivo deploys a{" "}
            <strong className="text-foreground font-semibold">live AI workspace that researches, drafts, and executes — start to finish</strong>.
            Not a template. Not a chatbot. A workflow that gets the job done.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground h-10 px-5 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
            <FeaturePill icon={<Compass className="h-4 w-4 text-primary" />} label="AI researches for you" />
            <FeaturePill icon={<Bot className="h-4 w-4 text-primary" />} label="Drafts, plans & emails done" />
            <FeaturePill icon={<Workflow className="h-4 w-4 text-primary" />} label="Full workflow, not just tools" />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-10 md:py-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Pick your niche</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Each workspace is a live AI built for one specific niche — it researches, drafts, and executes so you don&apos;t have to.
            </p>
          </div>
          <p className="hidden md:block text-sm text-muted-foreground">
            25 free credits on signup — no card required
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {WORKFLOW_CATALOG.map((niche) => {
            const category = NICHE_CATEGORIES[niche.id] ?? "Workflow";
            const href = `/signup?callbackUrl=${encodeURIComponent(`/members/setup/${niche.id}`)}&title=${encodeURIComponent(niche.name)}` as "/signup";
            return (
              <Link key={niche.id} href={href} className="block group">
                <article className="surface-card p-5 flex flex-col gap-4 h-full hover:shadow-lg hover:border-primary/30 transition-all">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${categoryColor(category)}`}>
                      {category}
                    </span>
                    <span className="text-xl">{niche.emoji}</span>
                  </div>

                  <div className="space-y-2 flex-1">
                    <h3 className="text-base font-semibold leading-snug group-hover:underline">
                      {niche.name}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {niche.tagline}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-primary mt-auto">
                    Get started free
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function categoryColor(cat: string): string {
  const c = cat.toLowerCase();
  if (c === "wedding")     return "bg-pink-50 text-pink-700 border-pink-200";
  if (c === "productivity") return "bg-sky-50 text-sky-700 border-sky-200";
  if (c === "creator")     return "bg-violet-50 text-violet-700 border-violet-200";
  if (c === "wellness")    return "bg-teal-50 text-teal-700 border-teal-200";
  if (c === "business")    return "bg-amber-50 text-amber-700 border-amber-200";
  if (c === "ecommerce")   return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (c === "property")    return "bg-orange-50 text-orange-700 border-orange-200";
  if (c === "creative")    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (c === "beauty")      return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-primary/8 text-primary border-primary/20";
}

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="surface-card px-3 py-2 text-sm flex items-center gap-2 bg-card/80">
      <span className="icon-badge">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
