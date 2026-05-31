import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { upsertUserCriteria } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  nicheId: z.string().min(1),
  answers: z.record(z.string(), z.unknown()),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "nicheId and answers are required" }, { status: 422 });
  }

  await upsertUserCriteria(userEmail, parsed.data.nicheId, parsed.data.answers);

  return NextResponse.json({ ok: true });
}
