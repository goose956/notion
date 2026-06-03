import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  charName: z.string().trim().min(1),
  role:     z.string().trim().default("Character"),
  genre:    z.string().trim().default(""),
  premise:  z.string().trim().default(""),
  notes:    z.string().trim().default(""),
  country:  z.string().trim().default(""),
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

  const { charName, role, genre, premise, notes, country } = parsed.data;
  const usEnglish = country.toLowerCase().includes("united states");
  const spelling  = usEnglish ? "US English (realize, color, organize)" : "British English (realise, colour, organise)";

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model = await resolveModel();
  const client = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const prompt = `Create a full character profile for ${charName}, the ${role} in a ${genre || "fiction"} novel.
${premise ? `Story premise: ${premise}` : ""}
${notes ? `What the author already knows about this character: ${notes}` : ""}
${country ? `Publishing market: ${country} — use ${spelling} throughout.` : ""}

Write a detailed character profile covering:

**Full Name & Age:** Name, age, and any relevant physical description

**Backstory:** 2–3 paragraphs — formative experiences, wounds, secrets, and how they shaped who this character is now

**Core Motivation:** What does this character want more than anything? What are they afraid of? What would they sacrifice?

**Fatal Flaw:** The one internal weakness that will complicate their journey and must be confronted

**Voice & Manner:** How they speak, move, and present themselves. What people notice first. Any habits or tics.

**Relationships:** How they relate to the protagonist (if not the protagonist), and 2–3 key relationships in their life

**Character Arc:** Where they start emotionally, the turning point, and where they end up

**Key Scene:** A short passage (150–200 words) showing this character in a moment that captures who they are

Make this character feel real, contradictory, and surprising. Avoid archetypes unless subverted.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const profile = (msg.content[0] as { type: string; text: string }).text;
  return NextResponse.json({ name: charName, profile });
}
