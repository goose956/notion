import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  deductCredits,
  findOrCreateCustomer,
  getCustomerCredits,
  getSettingValue,
} from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  topic: z.string().trim().min(1),
  title: z.string().trim().optional(),
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
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = session.user.email;

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { topic, title } = parsed.data;

  await findOrCreateCustomer(email).catch(() => null);
  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_IMAGE) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  }

  const apiKey = await resolveOpenAIKey(email);
  if (!apiKey) {
    return NextResponse.json({ error: "No OpenAI API key configured" }, { status: 500 });
  }

  const titleHint = title ? ` The pin title is: "${title}".` : "";
  const imagePrompt = `A beautiful, high-quality vertical Pinterest image (portrait orientation) about: ${topic}.${titleHint} The image should be visually compelling, well-composed, and suitable for Pinterest. No text overlays. Bright, clean, professional style.`;

  const openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1792",
      quality: "standard",
      response_format: "url",
    }),
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text().catch(() => "unknown error");
    console.error("OpenAI image error:", openaiRes.status, errText);
    return NextResponse.json({ error: "Image generation failed" }, { status: 502 });
  }

  const data = await openaiRes.json() as { data?: Array<{ url?: string }> };
  const url = data.data?.[0]?.url;
  if (!url) {
    return NextResponse.json({ error: "Image generation failed — no URL returned" }, { status: 500 });
  }

  await deductCredits(email, CREDITS_PER_IMAGE);

  return NextResponse.json({ url });
}
