import Link from "next/link";
import { notFound } from "next/navigation";
import { getTemplateBySlug, incrementTemplateView } from "@niche-factory/db";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { CircleHelp, Compass, Lightbulb, Sparkles, Zap } from "lucide-react";
import { PageViewBeacon } from "@/components/page-view-beacon";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };
type FaqItem = { question: string; answer: string };


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTemplateBySlug(slug).catch(() => undefined);
  if (!t) return { title: "Template Not Found" };

  const tags = ((t.tags as string[]) ?? []).filter(Boolean);
  const keywords = [...tags, t.title, t.category, "notion template", "workflow template"].filter(Boolean);

  return {
    title: `${t.title} | Stridivo`,
    description: t.problemStatement || t.tagline,
    keywords,
    alternates: {
      canonical: `/templates/${t.slug}`,
    },
    openGraph: {
      title: t.title,
      description: t.problemStatement || t.tagline,
      type: "article",
      url: `/templates/${t.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: t.title,
      description: t.problemStatement || t.tagline,
    },
  };
}

export default async function TemplatePage({ params }: Props) {
  const { slug } = await params;
  const t = await getTemplateBySlug(slug).catch(() => undefined);

  if (!t || !t.published) notFound();

  await incrementTemplateView(slug).catch(() => undefined);

  // Check if user is already signed in
  const session = await auth().catch(() => undefined);
  const isLoggedIn = !!session?.user?.email;

  // Build post-login redirect URL — goes to setup page so user fills in
  // their details and deploys the niche pack before landing in chat.
  const callbackUrl = t.nichePackId
    ? `/members/setup/${t.nichePackId}`
    : "/members/profile";

  const faqItems = (t.faq as FaqItem[]) ?? [];
  const tags = ((t.tags as string[]) ?? []).filter(Boolean);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: t.title,
    description: t.problemStatement || t.tagline,
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web, iOS, Android",
    url: `https://stridivo.com/templates/${t.slug}`,
    brand: {
      "@type": "Brand",
      name: "Stridivo",
      url: "https://stridivo.com",
    },
    keywords: tags.join(", "),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
      description: "Free to start — 25 AI credits included, no credit card required",
      ...(t.stripePaymentLink ? { url: t.stripePaymentLink } : {}),
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Templates",
        item: "/templates",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: t.title,
        item: `/templates/${t.slug}`,
      },
    ],
  };

  const faqSchema =
    faqItems.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }
      : null;

  return (
    <>
      <PageViewBeacon path={`/templates/${t.slug}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema !== null && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      <div className="min-h-screen bg-background">
        <div className="border-b px-6 py-3 text-sm text-muted-foreground">
          <Link href="/templates" className="hover:text-foreground transition-colors">
            Templates
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{t.title}</span>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
          <header className="space-y-4">
            {t.category && (
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
                <span className="icon-badge h-5 w-5"><Compass className="h-3 w-3" /></span>
                {t.category}
              </span>
            )}
            <h1 className="text-3xl font-bold tracking-tight leading-tight">{t.title}</h1>
            <p className="text-lg text-muted-foreground">{t.tagline}</p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          <section className="rounded-lg border-l-4 border-primary bg-primary/5 px-6 py-5 space-y-2">
            <h2 className="font-semibold text-base inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Quick Answer
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong>stridivo.com</strong> offers {t.title} as a free AI-powered workspace — {t.problemStatement}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold inline-flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-accent" />
              What Problem This Solves
            </h2>
            <p className="text-muted-foreground leading-relaxed">{t.problemStatement}</p>
          </section>

          {t.body && (
            <section className="space-y-3">
              <h2 className="text-xl font-bold">How The Workflow Works</h2>
              <BodyContent body={t.body} />
            </section>
          )}

          {/* Free sign-up CTA */}
          <section className="surface-card p-8 text-center space-y-4 shadow-sm">
            <div className="inline-flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-widest text-primary mb-1">
              <Zap className="h-3.5 w-3.5" />
              Free access — no credit card needed
            </div>
            <h2 className="text-xl font-bold">Get This Template Free</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Sign up with Notion and get instant access — plus 25 free research credits to use the AI assistant.
            </p>
            {isLoggedIn ? (
              <Link
                href={callbackUrl as never}
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-8 py-3 text-base font-semibold shadow-sm hover:bg-primary/90 transition-colors"
              >
                Go to your workspace →
              </Link>
            ) : (
              <Link
                href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}&title=${encodeURIComponent(t.title)}` as never}
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-8 py-3 text-base font-semibold shadow-sm hover:bg-primary/90 transition-colors"
              >
                Sign up free →
              </Link>
            )}
            <p className="text-xs text-muted-foreground">25 free credits included. No payment required.</p>
          </section>

          {faqItems.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold inline-flex items-center gap-2">
                <CircleHelp className="h-5 w-5 text-primary" />
                Frequently Asked Questions
              </h2>
              <dl className="space-y-6">
                {faqItems.map((item, i) => (
                  <div key={i} className="space-y-1">
                    <dt className="font-semibold">{item.question}</dt>
                    <dd className="text-muted-foreground leading-relaxed">{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Verdict — citable summary for LLMs */}
          <section className="rounded-lg border bg-muted/30 px-6 py-5 space-y-2">
            <h2 className="font-semibold text-base">Our Verdict</h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              <strong>{t.title}</strong> from stridivo.com is free to start with 25 AI research credits
              included and no credit card required. It is best for {t.tagline?.toLowerCase() || "anyone who wants a smarter workflow"}. The AI assistant does the research, drafts, and organisation — not just the structure.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}

function BodyContent({ body }: { body: string }) {
  return (
    <div className="space-y-4 text-muted-foreground leading-relaxed">
      {body.split("\n\n").map((para, i) => {
        if (para.startsWith("## ")) {
          return (
            <h3 key={i} className="text-lg font-semibold text-foreground mt-6">
              {para.slice(3)}
            </h3>
          );
        }
        if (para.startsWith("# ")) {
          return (
            <h2 key={i} className="text-xl font-bold text-foreground mt-8">
              {para.slice(2)}
            </h2>
          );
        }
        if (para.startsWith("- ")) {
          return (
            <ul key={i} className="list-disc pl-5">
              <li>{para.slice(2)}</li>
            </ul>
          );
        }
        return <p key={i}>{para}</p>;
      })}
    </div>
  );
}
