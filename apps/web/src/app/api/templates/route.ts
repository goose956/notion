import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { listTemplates, upsertTemplate } from "@niche-factory/db";

// GET /api/templates?search=&category=&published=true
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const publishedOnly = searchParams.get("published") === "true";
  const search = searchParams.get("search") ?? undefined;
  const category = searchParams.get("category") ?? undefined;

  try {
    const rows = await listTemplates({
      publishedOnly,
      ...(search ? { search } : {}),
      ...(category ? { category } : {}),
    });
    return NextResponse.json({ templates: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const TemplateBodySchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers and hyphens"),
  title: z.string().min(1),
  tagline: z.string().min(1),
  problemStatement: z.string().min(1),
  body: z.string().default(""),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
  category: z.string().default(""),
  tags: z.array(z.string()).default([]),
  stripePaymentLink: z.string().default(""),
  published: z.boolean().default(false),
});

// POST /api/templates — create or update a template (admin only)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = TemplateBodySchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ error: "Validation failed", issues: input.error.issues }, { status: 422 });
  }

  const data = input.data;
  try {
    const row = await upsertTemplate({
      id: data.id ?? randomUUID(),
      slug: data.slug,
      title: data.title,
      tagline: data.tagline,
      problemStatement: data.problemStatement,
      body: data.body,
      faq: data.faq,
      category: data.category,
      tags: data.tags,
      stripePaymentLink: data.stripePaymentLink,
      published: data.published,
    });
    return NextResponse.json({ template: row }, { status: data.id ? 200 : 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
