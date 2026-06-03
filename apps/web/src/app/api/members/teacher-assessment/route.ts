import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  topic:        z.string().trim().min(1),
  subject:      z.string().trim().default(""),
  yearGroup:    z.string().trim().default(""),
  type:         z.string().trim().default("Multiple choice quiz"),
  numQuestions: z.number().int().min(1).max(40).default(10),
  markScheme:   z.boolean().default(true),
  curriculum:   z.string().trim().default("England (National Curriculum)"),
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

  const { topic, subject, yearGroup, type, numQuestions, markScheme, curriculum } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const title = `${type} — ${topic}${yearGroup ? ` (${yearGroup})` : ""}`;

  const formatInstructions: Record<string, string> = {
    "Multiple choice quiz": `Write ${numQuestions} multiple choice questions. For each: write the question, then list options A, B, C, D. ${markScheme ? "After all questions, add a MARK SCHEME section with the correct answer and a brief explanation for each." : ""}`,
    "Short answer questions": `Write ${numQuestions} short answer questions worth 2–4 marks each. Include space indicators like [2 marks]. ${markScheme ? "After all questions, add a MARK SCHEME with model answers and marking points." : ""}`,
    "Essay questions": `Write ${numQuestions} essay question${numQuestions > 1 ? "s" : ""}. For each, include: the question, mark allocation, and a brief guidance note on what a strong answer should include. ${markScheme ? "Add a MARK SCHEME with assessment criteria and mark band descriptors." : ""}`,
    "Exam paper": `Write a full exam paper with ${numQuestions} questions across different question types (multiple choice, short answer, extended response). Include a header with Name/Date/Class fields, clear section breaks, and mark allocations. ${markScheme ? "Add a complete MARK SCHEME at the end." : ""}`,
    "Worksheet": `Create a classroom worksheet with ${numQuestions} tasks/activities. Mix question types: fill-in-the-blank, label diagrams (describe in text), match columns, short answers. Make it visually structured with clear task numbers. ${markScheme ? "Add an ANSWERS section at the end." : ""}`,
    "Marking rubric": `Create a detailed marking rubric for assessing student work on ${topic}. Include: assessment criteria (at least ${Math.min(numQuestions, 6)} criteria), mark bands (e.g. 0, 1–2, 3–4, 5–6 etc.), and specific descriptors for what each mark band looks like. Format as a clear table using plain text.`,
  };

  const format = formatInstructions[type] ?? formatInstructions["Multiple choice quiz"]!;

  const prompt = `Create a classroom-ready ${type.toLowerCase()} for the following:

- Topic: ${topic}
- Subject: ${subject || "Not specified"}
- Year group / level: ${yearGroup || "Not specified"}
- Curriculum: ${curriculum}

${format}

Make the questions appropriately challenging for the year group. Use clear, unambiguous language. Number all questions. The assessment should be ready to print and hand out with no further editing needed.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 2500,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const assessment = (msg.content[0] as { type: string; text: string }).text;
  return NextResponse.json({ assessment, title });
}
