import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findOrCreateCustomer } from "@niche-factory/db";

const BodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 422 });
  }

  try {
    await findOrCreateCustomer(parsed.data.email);
  } catch {
    // Non-fatal — customer row creation failure shouldn't block sign-up
  }

  return NextResponse.json({ ok: true });
}
