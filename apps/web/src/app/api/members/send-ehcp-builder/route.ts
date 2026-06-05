import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const Body = z.object({
  mode:                 z.enum(["new", "evidence", "review", "iep"]),
  observations:         z.string(),
  professionalEvidence: z.string().optional(),
  schoolConcerns:       z.string().optional(),
  currentSupport:       z.string().optional(),
  childStrengths:       z.string().optional(),
  urgency:              z.string().optional(),
  childName:            z.string().optional(),
  childAge:             z.string().optional(),
  diagnosis:            z.string().optional(),
  focus:                z.string().optional(),
  country:              z.string().optional(),
});

const COST = 2;

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

const MODE_PROMPTS: Record<string, string> = {
  new:      "Write a formal parental request for an Education, Health and Care Plan (EHCP) assessment. Use the parent's observations as evidence. Structure it with: an introduction, evidence of need (using the parent's observations, professional reports, and school concerns), why an EHC needs assessment is necessary, and a closing request. Tone: professional, clear, evidence-based.",
  evidence: "Turn the parent's everyday observations into professional EHCP evidence statements. Rewrite each observation using appropriate SEND language and terminology. Group evidence under EHCP sections: Communication & Interaction, Cognition & Learning, Social Emotional & Mental Health, Sensory & Physical. Include any professional evidence provided.",
  review:   "Prepare a position statement for an annual EHCP review. Structure it with: current provision summary, what's working and what's not, evidence of progress (or lack of), new needs that have emerged, requests for the review, and questions to raise at the meeting.",
  iep:      "Build evidence and goals for an IEP (Individualized Education Program) meeting. Structure with: Present Levels of Performance (from parent observations and professional evidence), Parent's Goals for this IEP period, Accommodations & Modifications the parent will request, Questions to ask the IEP team.",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  const email   = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < COST) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { mode, observations, professionalEvidence, schoolConcerns, currentSupport, childStrengths, urgency, childName, childAge, diagnosis, focus, country } = parsed.data;

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const modeInstruction = MODE_PROMPTS[mode] ?? MODE_PROMPTS["evidence"]!;
  const childDesc = [childName, childAge ? `age ${childAge}` : null, diagnosis].filter(Boolean).join(", ");

  const prompt = `You are an expert SEND advocate helping a parent create documentation for their child's education.
${childDesc ? `Child: ${childDesc}` : ""}${country ? ` | Country: ${country}` : ""}${focus ? ` | Current focus: ${focus}` : ""}${urgency && urgency !== "Not urgent" ? ` | Urgency: ${urgency}` : ""}

PARENT'S OBSERVATIONS:
${observations}
${professionalEvidence ? `\nPROFESSIONAL EVIDENCE:\n${professionalEvidence}` : ""}
${schoolConcerns ? `\nSCHOOL CONCERNS:\n${schoolConcerns}` : ""}
${currentSupport ? `\nCURRENT SUPPORT:\n${currentSupport}` : ""}
${childStrengths ? `\nCHILD'S STRENGTHS:\n${childStrengths}` : ""}

TASK: ${modeInstruction}

Also provide 5–8 "REVIEW QUESTIONS" — questions the parent should ask at their next meeting or review.

Format your response as:
DOCUMENT:
[main document]

REVIEW QUESTIONS:
[numbered questions]`;

  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 2500,
      messages:   [{ role: "user", content: prompt }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();

    const docStart = raw.indexOf("DOCUMENT:");
    const qStart   = raw.indexOf("REVIEW QUESTIONS:");
    const document  = docStart !== -1 ? (qStart !== -1 ? raw.slice(docStart + 9, qStart) : raw.slice(docStart + 9)).trim() : raw;
    const reviewQuestions = qStart !== -1 ? raw.slice(qStart + 17).trim() : "";

    const today = new Date().toISOString().slice(0, 10);
    const modeLabel = { new: "EHCP Request", evidence: "EHCP Evidence", review: "Annual Review Prep", iep: "IEP Builder" }[mode] ?? "EHCP Document";
    const title = `${modeLabel}${childName ? ` — ${childName}` : ""} · ${today}`;

    await deductCredits(customer.id, COST);
    return NextResponse.json({ document, reviewQuestions, title });
  } catch (err) {
    console.error("[send-ehcp-builder]", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
