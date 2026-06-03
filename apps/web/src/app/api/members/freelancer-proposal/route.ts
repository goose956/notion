import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  clientName:    z.string().trim().min(1),
  projectType:   z.string().trim().min(1),
  scope:         z.string().trim().default(""),
  deliverables:  z.string().trim().default(""),
  timeline:      z.string().trim().default(""),
  budget:        z.string().trim().default(""),
  yourName:      z.string().trim().default(""),
  yourService:   z.string().trim().default(""),
  country:       z.string().trim().default(""),
});

const CREDITS_PER_CALL = 2;

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

  const { clientName, projectType, scope, deliverables, timeline, budget, yourName, yourService, country } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const usEnglish = country.toLowerCase().includes("united states");
  const spelling  = usEnglish ? "US English (organize, color, etc.)" : "British English (organise, colour, etc.)";

  const prompt = `Write a professional freelance project proposal. This should be polished, confident and ready to send to a client. Use ${spelling}.

Freelancer: ${yourName || "the freelancer"}
Service offered: ${yourService || "freelance services"}
Client: ${clientName}
Project type: ${projectType}
${scope        ? `Project scope: ${scope}`             : ""}
${deliverables ? `Key deliverables: ${deliverables}`   : ""}
${timeline     ? `Proposed timeline: ${timeline}`      : ""}
${budget       ? `Budget / investment: ${budget}`      : ""}

Write a complete proposal with these sections:

**Introduction**
A confident, personalised opening (2–3 sentences). Acknowledge the client by name. Briefly position the freelancer's relevant expertise without being arrogant.

**Understanding Your Project**
Demonstrate a clear understanding of what the client needs and why it matters to their business. Show you've listened — paraphrase the brief back to them in a way that proves you get it.

**Proposed Approach**
How you will tackle this project, step by step. Include your process, methodology, and what makes your approach effective. This is where you sell your craft.

**Deliverables**
A clear, bulleted list of exactly what the client will receive. Be specific — no vague language.

**Timeline**
A realistic project schedule broken into phases. Include milestones and what happens at each stage.

**Investment**
The pricing, presented confidently. If a budget was provided, frame it as the investment required. Include any payment terms (e.g. 50% upfront, 50% on completion).

**Why Work With Me**
2–3 short, punchy reasons why this freelancer is the right choice. Not a list of skills — genuine reasons grounded in the project context.

**Next Steps**
A clear call to action: what the client should do to get started. Confident but not pushy.

End with a professional sign-off from ${yourName || "the freelancer"}.

Write this as a document the freelancer will copy and send. It should feel personal to ${clientName}, not generic. Professional tone — confident but not corporate.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const proposal = (msg.content[0] as { type: string; text: string }).text;
  const title = `Proposal — ${projectType} for ${clientName}`;
  return NextResponse.json({ proposal, title, clientName });
}
