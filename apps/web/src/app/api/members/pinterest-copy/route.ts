import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import {
  deductCredits,
  findOrCreateCustomer,
  getCustomerCredits,
  getSettingValue,
} from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  topic: z.string().trim().min(1),
  boardName: z.string().trim().optional(),
  niche: z.string().trim().optional(),
});

const CREDITS_PER_COPY = 1;

async function resolveApiKey(email: string): Promise<string | undefined> {
  const customerKey = await getSettingValue(`customer.${email}.anthropic.apiKey`);
  if (customerKey?.trim()) return customerKey.trim();
  const globalKey = await getSettingValue("anthropic.apiKey");
  if (globalKey?.trim()) return globalKey.trim();
  return process.env["ANTHROPIC_API_KEY"];
}

async function resolveModel(): Promise<string> {
  const model = await getSettingValue("anthropic.model");
  if (model?.trim()) return model.trim();
  return process.env["ANTHROPIC_MODEL"] ?? "claude-haiku-4-5";
}

interface PinCopy {
  title: string;
  description: string;
  tags: string[];
}

function extractJson(text: string): PinCopy | null {
  const fenced = /```json\s*([\s\S]*?)```/i.exec(text)?.[1];
  const raw = fenced ?? text;
  try {
    const parsed = JSON.parse(raw) as Partial<{ title: string; description: string; tags: unknown }>;
    if (!parsed.title || !parsed.description) return null;
    const tags = Array.isArray(parsed.tags)
      ? (parsed.tags as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 20)
      : [];
    return {
      title: parsed.title.trim().slice(0, 100),
      description: parsed.description.trim().slice(0, 500),
      tags,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = session.user.email;

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { topic, boardName, niche } = parsed.data;

  await findOrCreateCustomer(email).catch(() => null);
  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_COPY) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  }

  const apiKey = await resolveApiKey(email);
  if (!apiKey) {
    return NextResponse.json({ error: "No API key configured" }, { status: 500 });
  }

  const model = await resolveModel();
  const client = new Anthropic({ apiKey });

  const boardContext = boardName ? ` for the Pinterest board "${boardName}"` : "";
  const nicheContext = niche ? ` The content niche is: ${niche}.` : "";

  const prompt = `You are an expert Pinterest content creator. Generate SEO-optimised Pinterest pin copy${boardContext}.

Topic: ${topic}${nicheContext}

Return ONLY valid JSON in this exact format:
{
  "title": "Compelling pin title under 100 characters, keyword-rich",
  "description": "Engaging description under 500 characters. Include a call to action and relevant keywords naturally.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"]
}

Requirements:
- Title: hook the reader, include primary keyword, under 100 chars
- Description: natural, engaging, includes 2-3 keywords, ends with CTA
- Tags: 8-12 relevant hashtags without the # symbol, mix of broad and specific`;

  const message = await client.messages.create({
    model,
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const copy = extractJson(text);
  if (!copy) {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  await deductCredits(email, CREDITS_PER_COPY);

  return NextResponse.json(copy);
}
