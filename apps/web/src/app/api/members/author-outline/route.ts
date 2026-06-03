import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  section:    z.string().trim().min(1),
  bookTitle:  z.string().trim().default(""),
  genre:      z.string().trim().default(""),
  premise:    z.string().trim().default(""),
  pov:        z.string().trim().default(""),
  audience:   z.string().trim().default(""),
  extraNotes: z.string().trim().default(""),
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

const SECTION_PROMPTS: Record<string, string> = {
  "Premise & Hook": `Write a compelling Premise & Hook section for this story covering:
1. The core premise in one punchy sentence (the "elevator pitch")
2. The central conflict — what does the protagonist want, and what stands in the way?
3. The hook — what makes this story urgent, unique, or impossible to put down?
4. The emotional core — what feeling should the reader carry through the whole book?
5. Genre conventions this story uses or subverts
Write with energy and conviction. Make it feel like a back-cover blurb crossed with a director's statement.`,

  "Three-Act Structure": `Write a detailed Three-Act Structure breakdown:
Act 1 — Setup (roughly 25% of book):
- Opening image / inciting incident
- Protagonist's ordinary world and fatal flaw
- Call to action and the moment they cross into Act 2

Act 2 — Confrontation (roughly 50%):
- Rising stakes and escalating obstacles
- Midpoint twist or reversal
- Dark night of the soul — protagonist hits rock bottom

Act 3 — Resolution (roughly 25%):
- Climax — protagonist must use what they've learned
- Falling action
- Resolution / closing image

Be specific to this story's characters and premise. Each beat should feel inevitable in hindsight.`,

  "Chapter-by-Chapter Outline": `Write a chapter-by-chapter outline for the full book. For each chapter include:
- Chapter number and a working title
- POV character (if multiple POVs)
- What happens (2–3 sentences, plot-level)
- What changes (the emotional or situational shift by chapter end)
- Word count target (aim for 2,000–4,000 words per chapter)

Aim for 20–30 chapters total. Keep momentum — every chapter should end with a reason to read the next.`,

  "Subplots & Themes": `Write a Subplots & Themes breakdown covering:
1. Main theme — the central question the book asks (and tentatively answers)
2. Secondary themes — 2–3 supporting ideas woven through the story
3. Each subplot: who is involved, what it's about, how it mirrors or complicates the main plot, and where it resolves
4. Motifs and symbols — recurring images or objects that carry thematic weight
5. How the themes converge in the climax

Don't be preachy. Themes should emerge from character choices, not speeches.`,

  "Opening Scene": `Write the full opening scene of this book (approximately 800–1,200 words).
Requirements:
- Hook the reader in the first line — action, mystery, or a voice too compelling to ignore
- Establish the POV character's voice immediately
- Drop the reader into a specific place and moment — no preamble
- Hint at the central conflict without over-explaining
- End the scene with a question or tension that pulls the reader forward

Write actual prose, not a summary. Match the genre's tone precisely.`,

  "Climax & Resolution": `Write a detailed breakdown of the Climax & Resolution:
1. The climax scene — what happens, who is present, what choice the protagonist must make
2. How the protagonist's arc pays off — what have they learned, and how does it change their decision?
3. The villain/antagonist's final moment — defeated, redeemed, or escaped?
4. The immediate aftermath — what is different about the world now?
5. The resolution — where each major character ends up
6. The final image or line — what emotional note does the book close on?

The ending should feel both surprising and inevitable. Subvert expectations where possible.`,
};

export async function POST(req: NextRequest) {
  const session = await auth();
  const email   = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body   = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { section, bookTitle, genre, premise, pov, audience, extraNotes } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model = await resolveModel();

  const systemPrompt = `You are a professional story editor and developmental editor with decades of experience helping authors across all genres. You write with craft, precision and genuine storytelling instinct. Your job is to help the author build a compelling, commercially viable story that also has literary depth.

Book details:
- Title: ${bookTitle || "Untitled"}
- Genre: ${genre || "Not specified"}
- POV: ${pov || "Not specified"}
- Target audience: ${audience || "Not specified"}
${premise ? `- Premise: ${premise}` : ""}
${extraNotes ? `\nAdditional context from the author:\n${extraNotes}` : ""}`;

  const sectionPrompt = SECTION_PROMPTS[section] ?? `Write a detailed ${section} section for this story. Be specific, practical and useful to a writer working on their manuscript.`;

  const customer = await findOrCreateCustomer(email);
  const client   = new Anthropic({ apiKey });

  const msg = await client.messages.create({
    model,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: sectionPrompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const content = (msg.content[0] as { type: string; text: string }).text;
  return NextResponse.json({ section, content });
}
