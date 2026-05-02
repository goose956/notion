import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { refine } from "@niche-factory/ai";
import { NichePackSchema } from "@niche-factory/schema";

const RefineRequestSchema = z.object({
  currentPack: NichePackSchema,
  feedback: z.string().min(5),
});

// POST /api/ai/refine — modify an existing niche pack with AI
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = RefineRequestSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: input.error.issues },
      { status: 422 },
    );
  }

  let pack;
  try {
    pack = await refine({
      currentPack: input.data.currentPack,
      feedback: input.data.feedback,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI refinement failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ pack });
}
