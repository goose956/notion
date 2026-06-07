import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  studentName:  z.string().trim().min(1),
  parentName:   z.string().trim().default(""),
  subject:      z.string().trim().default(""),
  yearGroup:    z.string().trim().default(""),
  emailType:    z.string().trim().default("Progress Update"),
  strengths:    z.string().trim().default(""),
  concerns:     z.string().trim().default(""),
  context:      z.string().trim().default(""),
  tone:         z.string().trim().default("Friendly & professional"),
  teacherName:  z.string().trim().default(""),
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

  const { studentName, parentName, subject, yearGroup, emailType, strengths, concerns, context, tone, teacherName } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const salutation = parentName ? `Dear ${parentName},` : "Dear Parent/Guardian,";
  const signOff    = teacherName ? `Kind regards,\n${teacherName}` : "Kind regards,";

  const purposeMap: Record<string, string> = {
    "Progress Update":    "a positive progress update — share what the student is doing well, how they've grown, and what to focus on next",
    "Concern":            "a concern about the student's progress or behaviour — be factual, empathetic, suggest next steps, and invite a conversation",
    "Praise":             "a praise email — celebrate a specific achievement or improvement, be warm and genuine",
    "Meeting Request":    "a request to meet with the parent — explain why briefly, keep it non-alarming, suggest how to book a time",
    "General Update":     "a general end-of-term or mid-term update — friendly, informative, covering progress and upcoming work",
  };

  const purpose = purposeMap[emailType] ?? purposeMap["Progress Update"]!;

  const prompt = `Write a professional parent email from a teacher. The purpose is ${purpose}.

Student: ${studentName}${yearGroup ? `, ${yearGroup}` : ""}${subject ? `, ${subject}` : ""}
${strengths ? `Positives/strengths to mention: ${strengths}` : ""}
${concerns ? `Concerns or areas to address: ${concerns}` : ""}
${context ? `Additional context: ${context}` : ""}
Tone: ${tone}

Format the email exactly like this:
${salutation}

[Email body — 2–3 short paragraphs. Be specific, not generic. Reference the student by first name. No bullet points. Natural, human writing.]

${signOff}

Output only the email text — no subject line, no preamble, no quotes.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const emailText = (msg.content[0] as { type: string; text: string }).text.trim();
  return NextResponse.json({ email: emailText });
}
