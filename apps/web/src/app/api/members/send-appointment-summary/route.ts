import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const Body = z.object({
  apptType:     z.string(),
  professional: z.string().optional(),
  notes:        z.string(),
  childName:    z.string().optional(),
  diagnosis:    z.string().optional(),
});

const COST = 1;

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

export async function POST(req: NextRequest) {
  const session = await auth();
  const email   = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < COST) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { apptType, professional, notes, childName, diagnosis } = parsed.data;

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const childDesc = [childName, diagnosis ? `(${diagnosis})` : null].filter(Boolean).join(" ");

  const prompt = `You are a specialist SEND documentation assistant. A parent has just attended a ${apptType} appointment${professional ? ` with ${professional}` : ""}.
${childDesc ? `Child: ${childDesc}` : ""}

Their rough notes from the appointment:
${notes}

Create three documents:

1. SUMMARY (2–4 paragraphs) — A clear, professional summary of what was discussed and decided. Write in third person as a factual record ("The SALT team reported...", "It was agreed that...").

2. HANDOVER NOTE (1–2 paragraphs) — A brief note a parent can share with other professionals (school, GP, etc.) to update them on what was said. Professional but accessible tone.

3. ACTIONS & FOLLOW-UPS — A bulleted list of:
   - Actions the parent needs to take (with any implied deadlines)
   - Actions the professional committed to
   - Things to chase up / follow up on

Format your response EXACTLY as:
SUMMARY:
[summary text]

HANDOVER NOTE:
[handover text]

ACTIONS & FOLLOW-UPS:
[actions text]`;

  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 1500,
      messages:   [{ role: "user", content: prompt }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();

    const extract = (label: string, next: string) => {
      const start = raw.indexOf(`${label}:`);
      if (start === -1) return "";
      const end = raw.indexOf(`${next}:`);
      const slice = end === -1 ? raw.slice(start + label.length + 1) : raw.slice(start + label.length + 1, end);
      return slice.trim();
    };

    const summary  = extract("SUMMARY", "HANDOVER NOTE");
    const handover = extract("HANDOVER NOTE", "ACTIONS & FOLLOW-UPS");
    const actions  = extract("ACTIONS & FOLLOW-UPS", "~~~NONE~~~");

    const today = new Date().toISOString().slice(0, 10);
    const title = `${apptType} Summary${childName ? ` — ${childName}` : ""} · ${today}`;

    await deductCredits(customer.id, COST);
    return NextResponse.json({ summary, handover, actions, title });
  } catch (err) {
    console.error("[send-appointment-summary]", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
