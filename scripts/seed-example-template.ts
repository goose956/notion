import { randomUUID } from "node:crypto";
import { getTemplateBySlug, upsertTemplate } from "../packages/db/src/queries.ts";
import postgres from "postgres";

async function main() {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  // Ensure table exists in environments where migration 0002 has not run yet.
  const sql = postgres(url, { max: 1 });
  await sql`
    CREATE TABLE IF NOT EXISTS "templates" (
      "id" text PRIMARY KEY NOT NULL,
      "slug" text NOT NULL,
      "title" text NOT NULL,
      "tagline" text NOT NULL,
      "problem_statement" text NOT NULL,
      "body" text DEFAULT '' NOT NULL,
      "faq" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "category" text DEFAULT '' NOT NULL,
      "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "stripe_payment_link" text DEFAULT '' NOT NULL,
      "published" boolean DEFAULT false NOT NULL,
      "view_count" integer DEFAULT 0 NOT NULL,
      "click_count" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "templates_slug_unique" UNIQUE("slug")
    );
  `;
  await sql.end();

  const slug = "track-youtube-videos-forex";
  const existing = await getTemplateBySlug(slug);

  const row = await upsertTemplate({
    id: existing?.id ?? randomUUID(),
    slug,
    title: "Track YouTube Videos for Forex Niche",
    tagline: "Capture, score, and prioritize forex YouTube videos in one Notion workflow.",
    problemStatement:
      "If you research forex creators manually, important videos get lost across tabs, bookmarks, and notes. This template gives you one place to capture every video, score quality, and turn insights into repeatable trade ideas.",
    body: `## Who This Is For

This template is for forex traders, research assistants, and content-driven analysts who learn from YouTube daily and need a reliable research pipeline.

## What's Inside

You get a structured Notion database with fields for channel, video URL, strategy type, timeframe, confidence, and action status. It also includes views for New, Review, and High-Signal videos so you can focus quickly.

## How It Works

Add each relevant video as you discover it. Tag it by setup type and market condition, then rate confidence and notes quality. Review your high-signal queue daily and push top ideas into your execution plan.

## Why It Solves the Workflow

Instead of re-watching random videos or forgetting key setups, this system centralizes your learning loop and helps you build a searchable edge over time.`,
    faq: [
      {
        question: "Can I use this even if I am a beginner trader?",
        answer:
          "Yes. The template is beginner-friendly and helps you organize what you are learning so you can improve consistency faster.",
      },
      {
        question: "Does this work only for forex?",
        answer:
          "No. It is optimized for forex by default, but you can adapt tags and fields for crypto, stocks, or options.",
      },
      {
        question: "How do I get the template after purchase?",
        answer:
          "After payment, you can manually share your Notion duplicate link as your current delivery flow.",
      },
    ],
    category: "Finance",
    tags: ["forex", "youtube", "research", "notion template"],
    stripePaymentLink: "https://buy.stripe.com/test_example_link",
    published: true,
  });

  console.log(`Seeded template: ${row.slug}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
