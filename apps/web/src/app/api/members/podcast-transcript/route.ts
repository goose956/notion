import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  episodeTitle: z.string().trim().default(""),
  transcript:   z.string().trim().min(1),
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

  const { episodeTitle, transcript } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  // Truncate transcript to avoid token limits — first 12000 chars covers ~2000+ words
  const truncated = transcript.length > 12000 ? transcript.slice(0, 12000) + "\n\n[Transcript truncated for processing]" : transcript;

  const prompt = `You are a podcast content repurposing specialist. Process this episode transcript and extract maximum value from it.
${episodeTitle ? `\nEpisode title: ${episodeTitle}` : ""}

TRANSCRIPT:
${truncated}

Produce the following outputs:

**EPISODE SUMMARY**
A 3–4 paragraph narrative summary of the full episode. Written in an engaging style — suitable for a blog post or newsletter. Covers the main arc, key insights, and conclusion. Do not use bullet points here.

**KEY TAKEAWAYS**
The 5–7 most valuable, actionable insights from this episode. Each takeaway should be 1–2 sentences — specific enough to be useful out of context.

**NOTABLE QUOTES**
4–6 direct quotes from the transcript that are compelling, shareable or insightful. Format each as:
"[exact quote]"
— Context: [1 sentence explaining who said it and why it matters]

**CHAPTER MARKERS**
Create 6–10 chapter markers in the format:
[Approx timestamp] — Chapter title
Base timestamps on where topics naturally shift in the transcript. Make titles descriptive (not just "Introduction" or "Discussion").

**SOCIAL MEDIA CLIPS**
3 short, self-contained clips optimised for social sharing. For each:
- Clip title (for the post)
- The exact transcript excerpt (verbatim, 30–90 seconds of speech)
- Platform recommendation (LinkedIn, Instagram Reels, TikTok, Twitter/X)
- Suggested caption (ready to post)

**BLOG POST INTRO**
A 150–200 word blog post introduction that turns this episode into a written article. Start with a hook, set up the topic, and end with a transition into the main content.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 2500,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const summary = (msg.content[0] as { type: string; text: string }).text;
  const titleBase = episodeTitle || "Episode";
  const title = `Transcript Summary: ${titleBase}`;
  return NextResponse.json({ summary, title, episodeName: titleBase });
}
