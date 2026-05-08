import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { TEMPLATE_CATEGORIES } from "@/lib/template-categories";

const DraftTemplateSchema = z.object({
  title: z.string().min(3),
});

const defaultBody = `## Quick Answer

## What This Template Solves

## Who This Is For

## How It Works

## What's Included

## Common Questions`;

/**
 * POST /api/ai/draft-template
 * Generate a template page draft (tagline, problem statement, body, FAQ)
 * from just a title. Admin only.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = DraftTemplateSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ error: "Validation failed", issues: input.error.issues }, { status: 422 });
  }

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const client = new Anthropic({ apiKey });
  const { title } = input.data;

  const prompt = `You are a copywriter creating a directory page for a Notion workflow template.

Template title: "${title}"

Generate the following in valid JSON with no extra text:
{
  "tagline": "One punchy sentence (max 15 words) describing what this template does",
  "problemStatement": "2-3 sentences describing the exact workflow problem this solves, written from the user's pain point perspective",
  "body": "Markdown body (use ## for sections). Start with ## Quick Answer, then include ## What This Template Solves, ## Who This Is For, ## How It Works, ## What's Included, and ## Common Questions. Each section should be 2-4 sentences and total ~300 words.",
  "faq": [
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." }
  ],
  "category": "One of: ${TEMPLATE_CATEGORIES.join(", ")}",
  "tags": ["tag1", "tag2", "tag3", "tag4"]
}

Write for an audience searching with natural language queries like "${title}". Be specific, concrete, and helpful.`;

  let text: string;
  try {
    const message = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const block = message.content[0];
    text = block?.type === "text" ? block.text : "";
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Extract JSON from the response (handle code fences if present)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "AI returned non-JSON response", raw: text }, { status: 502 });
  }

  let draft: unknown;
  try {
    draft = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI JSON", raw: text }, { status: 502 });
  }

  if (typeof draft === "object" && draft !== null) {
    const record = draft as Record<string, unknown>;
    if (typeof record["body"] !== "string" || !record["body"].trim()) {
      record["body"] = defaultBody;
    }
  }

  return NextResponse.json({ draft });
}
