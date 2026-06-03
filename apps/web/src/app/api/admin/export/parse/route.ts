import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSettingValue } from "@niche-factory/db";

export async function POST(req: NextRequest) {
  const { name, description } = await req.json();

  const key = await getSettingValue("anthropic.apiKey");
  if (!key) return NextResponse.json({ error: "No Anthropic key configured" }, { status: 500 });

  const model = (await getSettingValue("anthropic.model")) || "claude-haiku-4-5-20251001";

  const client = new Anthropic({ apiKey: key });

  const msg = await client.messages.create({
    model,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are writing Etsy listing copy for an AI-powered Notion workspace app.

App: "${name}"
Description: "${description}"

Return a JSON object (no markdown) with:
- features: array of exactly 5 short feature bullet points (max 8 words each, benefit-first)
- target_audience: 1 short sentence describing the target buyer (for Etsy)
- seed_keywords: comma-separated list of 8-12 search keywords a buyer would use on Etsy

Example format:
{"features":["AI writes your full business plan","12-month financial projector included","Compliance checklist auto-generated","Pricing calculator stops undercharging","Works in Notion — no extra tools"],"target_audience":"Small business owners and side hustlers who want a complete AI-powered business plan without hiring a consultant","seed_keywords":"business plan template, ai business planner, notion business template, side hustle planner, financial projector"}`,
      },
    ],
  });

  const text = (msg.content[0] as { type: string; text: string }).text.trim();
  try {
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return NextResponse.json(JSON.parse(match[0]));
    }
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
