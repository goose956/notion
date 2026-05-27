import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { upsertUserCriteria } from "@niche-factory/db";

const BodySchema = z.object({
  nicheId: z.string().min(1),
  answers: z.record(z.string(), z.unknown()),
});

/** POST /api/onboarding — save niche onboarding answers for the logged-in user. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email;

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

  const { nicheId, answers } = parsed.data;

  try {
    await upsertUserCriteria(email, nicheId, answers);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save answers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
