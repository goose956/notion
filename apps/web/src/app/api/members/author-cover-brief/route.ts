import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  bookTitle:   z.string().trim().default(""),
  genre:       z.string().trim().default(""),
  audience:    z.string().trim().default(""),
  mood:        z.string().trim().default(""),
  compTitles:  z.string().trim().default(""),
  keyImagery:  z.string().trim().default(""),
  avoid:       z.string().trim().default(""),
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

  const { bookTitle, genre, audience, mood, compTitles, keyImagery, avoid } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const prompt = `Write a professional cover design brief for a book designer or cover artist. Be specific, visual, and practical.

Book details:
- Title: ${bookTitle || "Untitled"}
- Genre: ${genre || "Not specified"}
- Target audience: ${audience || "Not specified"}
- Mood/tone: ${mood || "Not specified"}
${compTitles ? `- Comp titles (covers that inspired this): ${compTitles}` : ""}
${keyImagery ? `- Key imagery from the story: ${keyImagery}` : ""}
${avoid ? `- Avoid: ${avoid}` : ""}

Write a structured cover brief with these sections:

**Overall Vision**
A 2–3 sentence description of what the cover should make the reader feel. What's the immediate emotional hit when they see it?

**Imagery & Composition**
Specific visual elements — what's on the cover, how is it composed, what's the focal point? Is it character-focused, object-focused, landscape, abstract? Portrait or landscape crop for the spine/thumbnail?

**Colour Palette**
Name 3–5 specific colours with hex codes or descriptive names (e.g. "deep navy #1a2744", "blood orange #cc4400"). Explain the mood each colour carries.

**Typography Style**
Font personality (serif vs sans, modern vs classic, bold vs elegant). Title treatment — large and dominant, or small and understated? Any special effects (embossing, foil, texture)?

**Mood Reference Images**
Describe 3–4 specific images or cover designs the artist should search for as reference. Include enough detail that they can find them (e.g. "The cover of 'Gone Girl' by Gillian Flynn — the blurred figure, the colour split").

**What to Avoid**
Specific things that would kill the brief — clichés for this genre, colours that clash with the mood, imagery that sends the wrong signal.

**Thumbnail Test**
How should the cover look at 100px wide on Amazon? What single element must remain readable/visible at that size?

Be a creative director giving a detailed brief, not a vague mood board. The designer should be able to start immediately from this document.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const brief = (msg.content[0] as { type: string; text: string }).text;
  return NextResponse.json({ brief });
}
