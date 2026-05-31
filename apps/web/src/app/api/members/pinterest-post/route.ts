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
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().default(""),
  tags: z.array(z.string().trim()).max(20).optional().default([]),
  topic: z.string().trim().optional().default(""),
  /** Either a public URL or a base64 data URL */
  imageSource: z.string().min(1),
  /** True when imageSource is a base64 data URL (data:image/...) */
  isBase64: z.boolean().optional().default(false),
  boardName: z.string().trim().optional(),
});

const CREDITS_PER_POST = 1;

async function resolvePinterestToken(email: string): Promise<string | undefined> {
  const customerToken = await getSettingValue(`customer.${email}.pinterest.accessToken`);
  if (customerToken?.trim()) return customerToken.trim();
  return process.env["PINTEREST_ACCESS_TOKEN"];
}

async function resolveBoardId(email: string): Promise<string | undefined> {
  const customerBoard = await getSettingValue(`customer.${email}.pinterest.boardId`);
  if (customerBoard?.trim()) return customerBoard.trim();
  return process.env["PINTEREST_BOARD_ID"];
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
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { title, description, tags, topic, imageSource, isBase64 } = parsed.data;

  await findOrCreateCustomer(email).catch(() => null);
  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_POST) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  }

  const accessToken = await resolvePinterestToken(email);
  if (!accessToken) {
    return NextResponse.json({ error: "No Pinterest access token configured" }, { status: 500 });
  }

  const boardId = await resolveBoardId(email);
  if (!boardId) {
    return NextResponse.json({ error: "No Pinterest board ID configured" }, { status: 500 });
  }

  // Build the note (description + hashtags)
  const hashTags = tags.map((t) => `#${t.replace(/^#/, "")}`).join(" ");
  const note = [description, hashTags].filter(Boolean).join("\n\n").trim();

  // Determine media source
  let mediaSource: Record<string, string>;
  if (isBase64) {
    // Strip the data URL prefix to get raw base64
    const base64Data = imageSource.replace(/^data:image\/\w+;base64,/, "");
    const contentType = /^data:(image\/\w+);/.exec(imageSource)?.[1] ?? "image/jpeg";
    mediaSource = {
      source_type: "image_base64",
      content_type: contentType,
      data: base64Data,
    };
  } else {
    mediaSource = {
      source_type: "image_url",
      url: imageSource,
    };
  }

  const pinBody = {
    title,
    description: note,
    board_id: boardId,
    media_source: mediaSource,
  };

  const pinterestRes = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pinBody),
  });

  if (!pinterestRes.ok) {
    const errText = await pinterestRes.text().catch(() => "unknown error");
    console.error("Pinterest API error:", pinterestRes.status, errText);
    return NextResponse.json(
      { error: `Pinterest API error: ${pinterestRes.status}`, detail: errText },
      { status: 502 }
    );
  }

  const pinData = (await pinterestRes.json()) as {
    id?: string;
    link?: string;
    media?: { images?: { originals?: { url?: string } } };
  };

  const pinId = pinData.id ?? "";
  const pinUrl = pinData.link ?? (pinId ? `https://www.pinterest.com/pin/${pinId}/` : "");
  const imageUrl = isBase64 ? "" : imageSource;

  await deductCredits(email, CREDITS_PER_POST);

  return NextResponse.json({ pinId, pinUrl, imageUrl, topic });
}
