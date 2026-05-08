import { notFound } from "next/navigation";
import { getTemplateBySlug, incrementTemplateView } from "@niche-factory/db";
import type { TemplateRow } from "@niche-factory/db";
import type { Metadata } from "next";
import { BuyButton } from "./buy-button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTemplateBySlug(slug).catch(() => undefined);
  if (!t) return { title: "Template Not Found" };
  return {
    title: `${t.title} | Niche Factory`,
    description: t.tagline,
    openGraph: {
      title: t.title,
      description: t.tagline,
      type: "website",
    },
  };
}

export default async function TemplatePage({ params }: Props) {
  const { slug } = await params;
  const t = await getTemplateBySlug(slug).catch(() => undefined);

  if (!t || !t.published) notFound();

  await incrementTemplateView(slug).catch(() => undefined);

  const faqItems = (t.faq as { question: string; answer: string }[]) ?? [];
  const tags = (t.tags as string[]) ?? [];

  return (
    <>
      {/* JSON-LD structured data for LLM / search */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: t.title,
            description: t.tagline,
            category: t.category || undefined,
            offers: t.stripePaymentLink
              ? {
                  "@type": "Offer",
                  url: t.stripePaymentLink,
                  priceCurrency: "USD",
                  availability: "https://schema.org/InStock",
                }
              : undefined,
          }),
        }}
      />

      <div className="min-h-screen bg-background">
        {/* Header breadcrumb */}
        <div className="border-b px-6 py-3 text-sm text-muted-foreground">
          <a href="/templates" className="hover:text-foreground transition-colors">
            Templates
          </a>
          <span className="mx-2">/</span>
          <span className="text-foreground">{t.title}</span>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
          {/* Title block */}
          <header className="space-y-4">
            {t.category && (
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
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

          {/* Problem Statement */}
          <section className="rounded-lg border-l-4 border-primary bg-primary/5 px-6 py-5 space-y-2">
            <h2 className="font-semibold text-base">The Problem</h2>
            <p className="text-muted-foreground leading-relaxed">{t.problemStatement}</p>
          </section>

          {/* Body (markdown rendered as plain paragraphs) */}
          {t.body && (
            <section className="prose prose-neutral dark:prose-invert max-w-none">
              <BodyContent body={t.body} />
            </section>
          )}

          {/* Buy CTA */}
          {t.stripePaymentLink && (
            <section className="rounded-xl border bg-card p-8 text-center space-y-4 shadow-sm">
              <h2 className="text-xl font-bold">Get This Template</h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                One-time purchase. Instant access to the full Notion workspace template.
              </p>
              <BuyButton href={t.stripePaymentLink} slug={t.slug} />
            </section>
          )}

          {/* FAQ */}
          {faqItems.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold">Frequently Asked Questions</h2>
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

/** Render body markdown-like content as paragraphs / headings */
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
        return <p key={i}>{para}</p>;
      })}
    </div>
  );
}
