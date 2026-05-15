import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { setCustomerCredits } from "@niche-factory/db";

const BodySchema = z.object({
  email: z.string().email(),
  credits: z.number().int().min(0).max(100_000),
});

export async function PATCH(req: NextRequest) {
  // Require an authenticated session (admin pages already protect via layout,
  // but we double-check here so the API endpoint is not open).
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  await setCustomerCredits(parsed.data.email, parsed.data.credits);
  return NextResponse.json({ ok: true, email: parsed.data.email, credits: parsed.data.credits });
}
