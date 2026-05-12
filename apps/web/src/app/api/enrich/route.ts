import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { NotionApiClient } from "@niche-factory/notion-client";
import { getSettings } from "@niche-factory/db";

const EnrichRequestSchema = z.object({
  /** The Notion page ID to enrich */
  pageId: z.string().min(1),
  /** The enrichment prompt template — use {{FIELD_NAME}} for substitution */
  prompt: z.string().min(1),
  /** Values to substitute into the prompt */
  context: z.record(z.string(), z.string()).optional(),
  /** The Notion property name to write the result back to (rich_text) */
  targetProperty: z.string().min(1),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();

  const body: unknown = await req.json();
  const parsed = EnrichRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { pageId, prompt, context, targetProperty } = parsed.data;

  const settings = await getSettings(["anthropic.apiKey", "anthropic.model"]);
  const apiKey = settings["anthropic.apiKey"] || process.env["ANTHROPIC_API_KEY"];
  const model = settings["anthropic.model"] || process.env["ANTHROPIC_MODEL"] || "claude-3-5-sonnet-20241022";
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  // Substitute context values into the prompt
  const resolvedPrompt = Object.entries(context ?? {}).reduce(
    (p, [k, v]) => p.replaceAll(`{{${k}}}`, v),
    prompt,
  );

  // Call Claude
  const client = new Anthropic({ apiKey });
  let result: string;
  try {
    const message = await client.messages.create({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: resolvedPrompt }],
    });
    const block = message.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    result = block?.type === "text" ? block.text.trim() : "";
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI call failed" },
      { status: 502 },
    );
  }

  // Write result back to the Notion page property
  const notionToken =
    (session as typeof session & { notionToken?: string })?.notionToken ??
    process.env["NOTION_TOKEN"];

  if (!notionToken) {
    return NextResponse.json({ enriched: result });
  }

  const notionClient = new NotionApiClient({ auth: notionToken });
  try {
    await notionClient.call((c) =>
      c.pages.update({
        page_id: pageId,
        properties: {
          [targetProperty]: {
            rich_text: [{ type: "text", text: { content: result.slice(0, 2000) } }],
          },
        },
      }),
    );
  } catch (err) {
    return NextResponse.json(
      { enriched: result, writeError: err instanceof Error ? err.message : "Notion write failed" },
      { status: 207 },
    );
  }

  return NextResponse.json({ enriched: result });
}
