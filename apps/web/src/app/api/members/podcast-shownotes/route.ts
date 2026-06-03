import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  episodeTitle:  z.string().trim().min(1),
  episodeNumber: z.string().trim().default(""),
  guest:         z.string().trim().default(""),
  summary:       z.string().trim().default(""),
  keyPoints:     z.string().trim().default(""),
  links:         z.string().trim().default(""),
  cta:           z.string().trim().default(""),
  podcastName:   z.string().trim().default(""),
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

  const { episodeTitle, episodeNumber, guest, summary, keyPoints, links, cta, podcastName } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const prompt = `You are a podcast SEO and content specialist. Write complete, professional show notes for the following podcast episode. They should be ready to paste directly into Spotify for Podcasters, Apple Podcasts Connect, or any podcast host.

Episode title: ${episodeTitle}
${episodeNumber  ? `Episode number: ${episodeNumber}` : ""}
${podcastName    ? `Podcast name: ${podcastName}` : ""}
${guest          ? `Guest: ${guest}` : ""}
${summary        ? `Episode summary: ${summary}` : ""}
${keyPoints      ? `Key points / timestamps: ${keyPoints}` : ""}
${links          ? `Links to include: ${links}` : ""}
${cta            ? `Call to action: ${cta}` : ""}

Write complete show notes with these sections:

**EPISODE SUMMARY**
2–3 paragraph engaging description. Write it for both listeners and search engines. Include the main topic, what listeners will learn, and who should listen. Natural keyword use — don't stuff.

**WHAT YOU'LL LEARN**
4–6 bullet points of the key takeaways — specific, benefit-led, not vague.

**TIMESTAMPS**
Format each line as: [00:00] Section name
${keyPoints ? "Use the timestamps provided above. Add a brief description after each." : "Create realistic approximate timestamps based on a typical episode structure."}

**LINKS & RESOURCES**
List all links mentioned, with brief descriptions. Include a 'Follow the podcast' section with placeholder links if none provided.
${guest ? `\n**ABOUT THE GUEST**\nA short 2–3 sentence guest bio written in third person, suitable for the show notes.` : ""}

**CALL TO ACTION**
A natural, non-pushy closing paragraph encouraging listeners to subscribe, leave a review, and share — tailored to the CTA provided.

**HASHTAGS**
15–20 relevant hashtags for social sharing (mix of broad and niche).`;

  const msg = await client.messages.create({
    model,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const notes = (msg.content[0] as { type: string; text: string }).text;
  const title = `Show Notes: ${episodeTitle}${episodeNumber ? ` (Ep. ${episodeNumber})` : ""}`;
  return NextResponse.json({ notes, title, episodeName: episodeTitle });
}
