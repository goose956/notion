import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  studentName:  z.string().trim().min(1),
  subject:      z.string().trim().default(""),
  yearGroup:    z.string().trim().default(""),
  currentGrade: z.string().trim().default(""),
  targetGrade:  z.string().trim().default(""),
  strengths:    z.string().trim().default(""),
  improvements: z.string().trim().default(""),
  behaviour:    z.string().trim().default(""),
  tone:         z.string().trim().default("Professional & encouraging"),
  length:       z.string().trim().default("Standard (120–150 words)"),
});

const CREDITS_PER_CALL = 1;

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

  const body   = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { studentName, subject, yearGroup, currentGrade, targetGrade, strengths, improvements, behaviour, tone, length } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const wordTarget = length.includes("80") ? "80–100" : length.includes("180") ? "180–220" : "120–150";

  const prompt = `Write a professional school report comment for a student. This will appear in an official school report sent to parents/guardians.

Student details:
- Name: ${studentName}
- Subject: ${subject || "Not specified"}
- Year group: ${yearGroup || "Not specified"}
${currentGrade ? `- Current grade/attainment: ${currentGrade}` : ""}
${targetGrade ? `- Target grade: ${targetGrade}` : ""}
${strengths ? `- Key strengths: ${strengths}` : ""}
${improvements ? `- Areas for development: ${improvements}` : ""}
${behaviour ? `- Behaviour/attitude: ${behaviour}` : ""}

Tone: ${tone}
Target length: ${wordTarget} words

Requirements:
- Write in the third person (e.g. "Sarah has shown..." not "You have shown...")
- Be specific — avoid generic phrases like "works hard" without context
- Balance positive recognition with constructive, forward-looking targets
- End with an encouraging, specific next step or target
- Do not use the student's full name more than twice — vary with pronouns
- Write as a single paragraph (no headings or bullet points)
- Avoid clichés like "a pleasure to teach" unless behaviour genuinely warrants it

Output only the report comment text — no preamble, no quotes.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const comment = (msg.content[0] as { type: string; text: string }).text.trim();
  return NextResponse.json({ comment });
}
