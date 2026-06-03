import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  mode:      z.enum(["write", "continue", "rewrite", "dialogue"]),
  sceneDesc: z.string().trim().default(""),
  existing:  z.string().trim().default(""),
  genre:     z.string().trim().default(""),
  pov:       z.string().trim().default(""),
  tone:      z.string().trim().default(""),
  country:   z.string().trim().default(""),
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

  const { mode, sceneDesc, existing, genre, pov, tone, country } = parsed.data;
  const usEnglish = country.toLowerCase().includes("united states");
  const spelling  = usEnglish ? "US English (realize, color, organize)" : "British English (realise, colour, organise)";

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model  = await resolveModel();
  const client = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const context = [
    genre   && `Genre: ${genre}`,
    pov     && `POV: ${pov}`,
    tone    && `Tone: ${tone}`,
    country && `Publishing market: ${country} — use ${spelling}`,
  ].filter(Boolean).join("\n");

  const prompts: Record<string, string> = {
    write: `Write a complete scene based on this brief:
${sceneDesc}

${context}

Requirements:
- Write actual prose, not a summary or outline
- 600–1,000 words
- Show, don't tell — use action, dialogue and sensory detail
- Match the genre's tone and pacing precisely
- End with tension or a shift that makes the reader want to continue`,

    continue: `Continue this prose seamlessly. Match the author's voice, sentence rhythm, and tone exactly:

---
${existing}
---

Scene context: ${sceneDesc || "Continue naturally from where this leaves off"}
${context}

Requirements:
- Write 400–700 words of continuation
- Do not summarise or recap — pick up mid-momentum
- Keep the same POV, tense, and voice
- Advance the scene, don't just add more of the same`,

    rewrite: `Rewrite this passage to improve it. Keep the author's intent and story beats, but sharpen the prose:

---
${existing}
---

${sceneDesc ? `The author wants this scene to: ${sceneDesc}` : ""}
${context}

Rewrite to:
- Cut any redundant words or "telling" sentences
- Sharpen the dialogue — make every line pull double duty
- Improve pacing — vary sentence length for rhythm
- Add one moment of unexpected sensory detail or observation
- Keep the author's voice recognisable but elevate it`,

    dialogue: `Write a sharp dialogue exchange based on this brief:
${sceneDesc}

${context}

Requirements:
- 400–600 words of dialogue with minimal but precise action beats
- Every line should reveal character or advance the scene
- Avoid "as you know, Bob" exposition
- Subtext is everything — characters should rarely say exactly what they mean
- Include the moment where the power dynamic shifts`,
  };

  const msg = await client.messages.create({
    model,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompts[mode]! }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const content = (msg.content[0] as { type: string; text: string }).text;
  return NextResponse.json({ content });
}
