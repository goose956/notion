import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import {
  findOrCreateCustomer,
  getCustomerCredits,
  deductCredits,
  getSettingValue,
  getUserCriteria,
} from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  recipient: z.string().trim().optional(),
  purpose: z.string().trim().min(2),
  tone: z.string().trim().optional(),
  keyPoints: z.string().trim().optional(),
  extraInstructions: z.string().trim().optional(),
  nicheId: z.string().trim().optional(),
});

interface DraftResponse {
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

function extractJson(text: string): DraftResponse | null {
  const fenced = /```json\s*([\s\S]*?)```/i.exec(text)?.[1];
  const raw = fenced ?? text;
  try {
    const parsed = JSON.parse(raw) as Partial<DraftResponse>;
    if (!parsed.body || !parsed.subject) return null;
    return {
      title: parsed.title?.trim() || "Email Draft",
      subject: parsed.subject.trim(),
      body: parsed.body.trim(),
      summary: parsed.summary?.trim() || parsed.body.trim().slice(0, 220),
      type: parsed.type?.trim() || "Vendor Enquiry",
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
    return NextResponse.json({ error: "Draft studio is for app-hosted workspaces only." }, { status: 403 });
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
  if (credits < 2) {
    return NextResponse.json(
      { error: "You need at least 2 credits to generate a draft." },
      { status: 402 },
    );
  }

  const nicheId = body.data.nicheId ?? "wedding-planner";
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

  const systemPrompt = `You write polished wedding-planning outreach emails for brides.
Return ONLY valid JSON with keys: title, subject, body, summary, type.
Rules:
- body should be practical, ready-to-send, 140-260 words.
- keep tone warm and professional.
- include a clear call to action.
- summary should be one short sentence for quick scanning.
- type should usually be one of: Venue Enquiry, Vendor Enquiry, Guest Communication, Other.`;

  const userPrompt = `Draft an email for this purpose: ${parsed.data.purpose}
Recipient: ${parsed.data.recipient ?? "Vendor"}
Tone: ${parsed.data.tone ?? "Warm and professional"}
Key points: ${parsed.data.keyPoints ?? "(none provided)"}
Extra instructions: ${parsed.data.extraInstructions ?? "(none provided)"}
Wedding setup context:
${setupLines || "(none yet)"}`;

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1400,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = res.content.find((b) => b.type === "text");
    const content = text?.type === "text" ? text.text : "";

    const draft =
      extractJson(content) ??
      {
        title: `Email Draft - ${parsed.data.purpose}`,
        subject: `Wedding enquiry: ${parsed.data.purpose}`,
        body: content.trim(),
        summary: content.trim().slice(0, 220),
        type: "Vendor Enquiry",
      };

    const newCredits = await deductCredits(userEmail, 2).catch(() => null);

    return NextResponse.json({ draft, credits: newCredits });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate draft";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
