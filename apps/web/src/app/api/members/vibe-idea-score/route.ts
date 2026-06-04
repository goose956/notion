import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  idea:          z.string().trim().min(1),
  targetUser:    z.string().trim().default(""),
  buildTime:     z.string().trim().default(""),
  monetisation:  z.string().trim().default(""),
  competitors:   z.string().trim().default(""),
  notes:         z.string().trim().default(""),
  builderNiche:  z.string().trim().default(""),
  stage:         z.string().trim().default(""),
  tool:          z.string().trim().default(""),
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

  const { idea, targetUser, buildTime, monetisation, competitors, notes, builderNiche, stage, tool } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const prompt = `You are an experienced indie hacker and startup scout. Score this product idea honestly. Don't be encouraging for the sake of it — give a real assessment. A bad idea should score badly.

Idea: ${idea}
${targetUser    ? `Target user: ${targetUser}` : ""}
${buildTime     ? `Estimated build time: ${buildTime}` : ""}
${monetisation  ? `Monetisation plan: ${monetisation}` : ""}
${competitors   ? `Known competitors: ${competitors}` : ""}
${builderNiche  ? `Builder's niche focus: ${builderNiche}` : ""}
${stage         ? `Builder's stage: ${stage}` : ""}
${tool          ? `Building with: ${tool}` : ""}
${notes         ? `Additional context: ${notes}` : ""}

Score this idea across 5 dimensions, then give a verdict. Be specific — reference the idea directly, not generic advice.

**SCORES** (each out of 10)

📊 Market Demand: X/10
How many people have this problem? Is there evidence they'd pay to solve it?
[2–3 sentences of reasoning specific to this idea]

🔨 Build Complexity: X/10
(10 = simple weekend hack, 1 = years of engineering)
How hard is this to build solo with AI coding tools? What are the technical risks?
[2–3 sentences]

💰 Monetisation Potential: X/10
Given the target user and pricing model, how likely is this to generate meaningful revenue?
[2–3 sentences]

🎯 Differentiation: X/10
Does this stand out? Is there a genuine angle that makes it better or different from what exists?
[2–3 sentences]

⚡ Founder-Market Fit: X/10
Is this a good idea for someone at this stage with this tool? Does the builder have advantages here?
[2–3 sentences]

**OVERALL VIABILITY: XX/50**

---

**VERDICT**
🚀 BUILD IT | ⚠️ VALIDATE FIRST | 🚫 SKIP
[One direct paragraph justification. Be honest. If it's worth building, say why. If it needs validation, say exactly what to validate and how. If it's a skip, say why without softening it.]

---

**STRENGTHS**
3 specific things working in this idea's favour.

**RISKS**
3 specific risks for this exact idea — not generic startup risks.

**FASTEST PATH TO VALIDATION**
3 concrete steps to test demand before building. Each should take hours or days, not weeks.

**SUGGESTED MVP SCOPE**
If verdict is BUILD or VALIDATE: what is the smallest possible version worth building? List 3–5 core features and explicitly call out 3 things to cut from v1.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 1800,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const score = (msg.content[0] as { type: string; text: string }).text;
  const ideaSnippet = idea.slice(0, 60) + (idea.length > 60 ? "…" : "");
  const title = `Idea Score: ${ideaSnippet}`;
  return NextResponse.json({ score, title, ideaName: ideaSnippet });
}
