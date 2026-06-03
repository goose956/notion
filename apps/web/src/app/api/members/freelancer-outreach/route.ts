import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  prospectName:    z.string().trim().min(1),
  prospectCompany: z.string().trim().default(""),
  industry:        z.string().trim().default(""),
  pain:            z.string().trim().default(""),
  channel:         z.enum(["email", "linkedin", "instagram", "twitter"]).default("email"),
  yourName:        z.string().trim().default(""),
  yourService:     z.string().trim().default(""),
  tone:            z.enum(["professional", "friendly", "bold", "concise"]).default("professional"),
  country:         z.string().trim().default(""),
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

  const { prospectName, prospectCompany, industry, pain, channel, yourName, yourService, tone, country } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const usEnglish = country.toLowerCase().includes("united states");
  const spelling  = usEnglish ? "US English" : "British English";

  const channelGuide: Record<string, string> = {
    email:     "a cold outreach email (subject line + body). Keep under 150 words. No fluff, no lengthy intro. Get to value fast.",
    linkedin:  "a LinkedIn connection request message (under 300 characters for the note) followed by a first message to send once connected (under 200 words).",
    instagram: "a direct message on Instagram. Casual, brief, direct. Under 100 words. Should not read like a pitch — feel like a genuine human reaching out.",
    twitter:   "a Twitter/X DM. Very short — under 60 words. Hook with a specific observation about their work, then one clear offer.",
  };

  const toneGuide: Record<string, string> = {
    professional: "Confident and polished. Business-appropriate without being stiff.",
    friendly:     "Warm and conversational. Feels like a genuine person, not a template.",
    bold:         "Direct and punchy. Lead with a provocative or specific observation. No pleasantries.",
    concise:      "Strip everything non-essential. Every word must earn its place.",
  };

  const prompt = `Write ${channelGuide[channel] ?? channelGuide["email"]} from a freelancer to a potential client. Use ${spelling}.

Freelancer: ${yourName || "the freelancer"}
Service: ${yourService || "freelance services"}
Prospect: ${prospectName}${prospectCompany ? ` at ${prospectCompany}` : ""}
${industry ? `Industry: ${industry}` : ""}
${pain ? `Problem/angle to address: ${pain}` : ""}
Tone: ${toneGuide[tone] ?? toneGuide["professional"]}

Rules:
- Do NOT open with "I hope this finds you well" or any cliché opener
- Lead with something specific to them — an observation, a problem they likely have, or a result you can deliver
- One clear, specific value proposition — not a laundry list of services
- One call to action — make it low-commitment (a quick call, a yes/no question, not "let me know if you're interested")
- End with your name
- No attachments mentioned, no "please find attached portfolio"
- Sound like a human who did their homework, not a spam bot

Write the complete message(s) ready to copy and send.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const outreach = (msg.content[0] as { type: string; text: string }).text;
  const channelLabel = channel.charAt(0).toUpperCase() + channel.slice(1);
  const title = `${channelLabel} Outreach — ${prospectName}${prospectCompany ? ` (${prospectCompany})` : ""}`;
  return NextResponse.json({ outreach, title, clientName: prospectName });
}
