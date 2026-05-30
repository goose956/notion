import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import {
  deductCredits,
  findOrCreateCustomer,
  getCustomerCredits,
  getSettingValue,
  getUserCriteria,
} from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  coupleNames: z.string().trim().optional(),
  whoToThank: z.string().trim().optional(),
  howTheyMet: z.string().trim().optional(),
  whatBrideMeans: z.string().trim().optional(),
  specialMemory: z.string().trim().optional(),
  closingToast: z.string().trim().optional(),
  tone: z.string().trim().optional(),
  speechLength: z.string().trim().optional(),
  extraInstructions: z.string().trim().optional(),
  nicheId: z.string().trim().optional(),
});

const CREDITS_PER_SPEECH = 2;

interface SpeechDraft {
  title: string;
  subject: string;
  body: string;
  summary: string;
  type: string;
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

function extractJson(text: string): SpeechDraft | null {
  const fenced = /```json\s*([\s\S]*?)```/i.exec(text)?.[1];
  const raw = fenced ?? text;
  try {
    const parsed = JSON.parse(raw) as Partial<SpeechDraft>;
    if (!parsed.body) return null;
    return {
      title: parsed.title?.trim() || "Wedding Speech Draft",
      subject: parsed.subject?.trim() || "Wedding Speech",
      body: parsed.body.trim(),
      summary: parsed.summary?.trim() || parsed.body.trim().slice(0, 220),
      type: parsed.type?.trim() || "Speech Draft",
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

  const notionToken = (session as unknown as Record<string, unknown>)["notionToken"] as
    | string
    | undefined;

  if (notionToken) {
    return NextResponse.json({ error: "Speech writer is for app-hosted workspaces only." }, { status: 403 });
  }

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

  const userEmail = session.user.email;

  await findOrCreateCustomer(userEmail).catch(() => null);
  const credits = await getCustomerCredits(userEmail).catch(() => 0);
  if (credits < CREDITS_PER_SPEECH) {
    return NextResponse.json(
      { error: `You need ${CREDITS_PER_SPEECH} credit to generate a speech draft.` },
      { status: 402 },
    );
  }

  const nicheId = parsed.data.nicheId;
  if (!nicheId) {
    return NextResponse.json({ error: "nicheId is required" }, { status: 400 });
  }
  const [apiKey, model, criteria] = await Promise.all([
    resolveApiKey(userEmail),
    resolveModel(),
    getUserCriteria(userEmail, nicheId).catch(() => undefined),
  ]);

  if (!apiKey) {
    return NextResponse.json({ error: "AI is not configured." }, { status: 503 });
  }

  const userSetup = criteria?.criteria ?? {};
  const setupLines = Object.entries(userSetup)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join("\n");

  const client = new Anthropic({ apiKey });

  const systemPrompt = [
    "You write a polished wedding speech draft for someone speaking about the bride and couple.",
    "Return ONLY valid JSON with keys: title, subject, body, summary, type.",
    "Rules:",
    "- body should be natural spoken language, with clear opening, middle stories, and strong closing toast.",
    "- body length should align with the requested speech length.",
    "- keep it heartfelt, specific, and warm.",
    "- avoid cliches and generic filler.",
    "- include natural transitions between sections.",
    "- summary should be one concise sentence.",
    "- type must be exactly 'Speech Draft'.",
  ].join("\n");

  const details = parsed.data;
  const userPrompt = [
    `Couple names: ${details.coupleNames ?? "the couple"}`,
    `Who to thank: ${details.whoToThank ?? "(not provided)"}`,
    `How they met story: ${details.howTheyMet ?? "(not provided)"}`,
    `What the bride means to speaker: ${details.whatBrideMeans ?? "(not provided)"}`,
    `Special memory: ${details.specialMemory ?? "(not provided)"}`,
    `Closing toast: ${details.closingToast ?? "(not provided)"}`,
    `Tone: ${details.tone ?? "Warm and heartfelt"}`,
    `Target length: ${details.speechLength ?? "5-7 minutes"}`,
    `Extra instructions: ${details.extraInstructions ?? "(none provided)"}`,
    "Wedding setup context:",
    setupLines || "(none yet)",
  ].join("\n");

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 2200,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = res.content.find((b) => b.type === "text");
    const content = text?.type === "text" ? text.text : "";

    const draft =
      extractJson(content) ??
      {
        title: "Wedding Speech Draft",
        subject: `Wedding speech for ${details.coupleNames ?? "the couple"}`,
        body: content.trim(),
        summary: content.trim().slice(0, 220),
        type: "Speech Draft",
      };

    const newCredits = await deductCredits(userEmail, CREDITS_PER_SPEECH);

    return NextResponse.json({ draft, credits: newCredits });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate speech";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
