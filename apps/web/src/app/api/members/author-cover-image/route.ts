import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  bookTitle:  z.string().trim().default(""),
  genre:      z.string().trim().default(""),
  mood:       z.string().trim().default(""),
  imagery:    z.string().trim().default(""),
  palette:    z.string().trim().default(""),
  style:      z.string().trim().default(""),
});

const CREDITS_PER_IMAGE = 3;

async function resolveOpenAIKey(email: string): Promise<string | undefined> {
  const customerKey = await getSettingValue(`customer.${email}.openai.apiKey`);
  if (customerKey?.trim()) return customerKey.trim();
  const globalKey = await getSettingValue("openai.apiKey");
  if (globalKey?.trim()) return globalKey.trim();
  return process.env["OPENAI_API_KEY"];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const email   = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body   = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { bookTitle, genre, mood, imagery, palette, style } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_IMAGE) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveOpenAIKey(email);
  if (!apiKey) return NextResponse.json({ error: "No OpenAI API key configured" }, { status: 500 });

  const parts = [
    `Professional book cover design for a ${genre || "fiction"} novel titled "${bookTitle || "Untitled"}".`,
    mood      && `Mood: ${mood}.`,
    imagery   && `Key visual elements: ${imagery}.`,
    palette   && `Colour palette: ${palette}.`,
    style     && `Design style: ${style}.`,
    "Portrait orientation, photorealistic or illustrated depending on genre conventions.",
    "No text, title, or author name — concept art only.",
    "High production quality, suitable for commercial publishing.",
  ].filter(Boolean).join(" ");

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: parts,
      n: 1,
      size: "1024x1792",
      quality: "standard",
      response_format: "url",
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "unknown error");
    console.error("DALL-E cover error:", res.status, errText);
    return NextResponse.json({ error: "Image generation failed" }, { status: 502 });
  }

  const data = await res.json() as { data?: Array<{ url?: string }> };
  const url  = data.data?.[0]?.url;
  if (!url) return NextResponse.json({ error: "No image URL returned" }, { status: 500 });

  await deductCredits(email, CREDITS_PER_IMAGE);
  return NextResponse.json({ url });
}
