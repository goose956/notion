import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import {
  deductCredits,
  findOrCreateCustomer,
  getCustomerCredits,
  getSettingValue,
} from "@niche-factory/db";

const BodySchema = z.object({
  prompt: z.string().min(1),
  style: z.string().optional(),
  colours: z.string().optional(),
  coupleNames: z.string().optional(),
  weddingDate: z.string().optional(),
  venue: z.string().optional(),
});

interface GeneratedPayload {
  invitationText: string;
  thankYouText: string;
  colorPalette: string[];
  svg: string;
}

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

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```") || !trimmed.endsWith("```")) return trimmed;
  const firstLineEnd = trimmed.indexOf("\n");
  if (firstLineEnd === -1) return trimmed.replace(/```/g, "").trim();
  return trimmed.slice(firstLineEnd + 1, -3).trim();
}

function parsePayload(raw: string): GeneratedPayload {
  const parsed = JSON.parse(stripCodeFence(raw)) as Partial<GeneratedPayload>;
  return {
    invitationText: typeof parsed.invitationText === "string" ? parsed.invitationText : "",
    thankYouText: typeof parsed.thankYouText === "string" ? parsed.thankYouText : "",
    colorPalette: Array.isArray(parsed.colorPalette)
      ? parsed.colorPalette.filter((c): c is string => typeof c === "string").slice(0, 6)
      : [],
    svg: typeof parsed.svg === "string" ? parsed.svg : "",
  };
}

function sanitizeSvg(svg: string): string {
  let safe = svg.trim();
  safe = safe.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  safe = safe.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  safe = safe.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  if (!safe.startsWith("<svg")) {
    throw new Error("Model response did not include an SVG document");
  }
  return safe;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email ?? "member";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }

  await findOrCreateCustomer(userEmail).catch(() => null);
  const currentCredits = await getCustomerCredits(userEmail).catch(() => 0);
  if (currentCredits <= 0) {
    return NextResponse.json(
      { error: "You have no credits left. Top up to continue." },
      { status: 402 },
    );
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Claude is not configured. Missing ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  const client = new Anthropic({ apiKey });

  const prompt = [
    "Create wedding stationery content and a matching visual.",
    `Couple names: ${parsed.data.coupleNames ?? "Not provided"}`,
    `Wedding date: ${parsed.data.weddingDate ?? "Not provided"}`,
    `Venue: ${parsed.data.venue ?? "Not provided"}`,
    `Style: ${parsed.data.style ?? "Romantic"}`,
    `Preferred colours: ${parsed.data.colours ?? "Soft blush and ivory"}`,
    `User brief: ${parsed.data.prompt}`,
    "Return ONLY valid JSON with this exact shape:",
    '{"invitationText":"...","thankYouText":"...","colorPalette":["#hex"],"svg":"<svg ...>...</svg>"}',
    "SVG rules:",
    "- Use a 1200x1800 portrait layout.",
    "- No external images or fonts.",
    "- Keep typography elegant and readable.",
    "- Include invitation-focused headline and subtle decorative shapes.",
  ].join("\n");

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!text) {
      return NextResponse.json({ error: "Claude returned an empty response" }, { status: 502 });
    }

    const generated = parsePayload(text);
    const safeSvg = sanitizeSvg(generated.svg);

    await deductCredits(userEmail, 1).catch(() => null);

    return NextResponse.json({
      invitationText: generated.invitationText,
      thankYouText: generated.thankYouText,
      colorPalette: generated.colorPalette,
      svg: safeSvg,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
