import Link from "next/link";
import { notFound } from "next/navigation";
import { getTemplateBySlug, incrementTemplateView, customerOwnsTemplate } from "@niche-factory/db";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { BuyButton } from "./buy-button";
import { CircleHelp, Compass, Lightbulb, ListChecks, Sparkles, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };
type FaqItem = { question: string; answer: string };

function buildSearchIntents(title: string, category: string, tags: string[]): string[] {
  const base = [
    `${title} notion template`,
    `${title} workflow system`,
    `how to ${title.toLowerCase()}`,
    `${category || "workflow"} notion operating system`,
  ];

  const tagQueries = tags.slice(0, 3).map((tag) => `${tag} notion template`);

  return [...new Set([...base, ...tagQueries])].slice(0, 7);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTemplateBySlug(slug).catch(() => undefined);
  if (!t) return { title: "Template Not Found" };

  const tags = ((t.tags as string[]) ?? []).filter(Boolean);
  const keywords = [...tags, t.title, t.category, "notion template", "workflow template"].filter(Boolean);

  return {
    title: `${t.title} | Niche Factory`,
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

  // Check if the signed-in user already owns this template
  const session = await auth().catch(() => undefined);
  const userEmail = session?.user?.email ?? null;
  const owned = userEmail ? await customerOwnsTemplate(userEmail, t.id).catch(() => false) : false;

  const faqItems = (t.faq as FaqItem[]) ?? [];
  const tags = ((t.tags as string[]) ?? []).filter(Boolean);
  const searchIntents = buildSearchIntents(t.title, t.category, tags);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: t.title,
    description: t.problemStatement || t.tagline,
    category: t.category || undefined,
    brand: {
      "@type": "Brand",
      name: "Niche Factory",
    },
    keywords: tags.join(", "),
    offers: t.stripePaymentLink
      ? {
          "@type": "Offer",
          url: t.stripePaymentLink,
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        }
      : undefined,
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
              {t.title} is a Notion workflow template that helps you solve this problem: {t.problemStatement}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold inline-flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-accent" />
              What Problem This Template Solves
            </h2>
            <p className="text-muted-foreground leading-relaxed">{t.problemStatement}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold inline-flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              Common Queries This Page Answers
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              {searchIntents.map((query) => (
                <li key={query}>{query}</li>
              ))}
            </ul>
          </section>

          {t.body && (
            <section className="space-y-3">
              <h2 className="text-xl font-bold">How The Workflow Works</h2>
              <BodyContent body={t.body} />
            </section>
          )}

          {t.stripePaymentLink && (
            <section className="surface-card p-8 text-center space-y-4 shadow-sm">
              <h2 className="text-xl font-bold inline-flex items-center gap-2 justify-center">
                <Wallet className="h-5 w-5 text-primary" />
                Get This Template
              </h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                One-time purchase. Instant access to the full Notion workspace template.
              </p>
              <BuyButton
                href={t.stripePaymentLink}
                slug={t.slug}
                templateId={t.id}
                stripePriceId={t.stripePriceId}
                owned={owned}
              />
            </section>
          )}

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
