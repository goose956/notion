import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generate } from "@niche-factory/ai";
import { scaffoldAdapter } from "@niche-factory/ai";

const DraftRequestSchema = z.object({
  nicheDescription: z.string().min(10),
});

// POST /api/ai/draft — generate a full niche pack from a description
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = DraftRequestSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: input.error.issues },
      { status: 422 },
    );
  }

  let pack;
  try {
    pack = await generate({ nicheDescription: input.data.nicheDescription });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Generate adapter stubs for each data source
  const adapterStubs: Record<string, string> = {};
  for (const source of pack.dataSources ?? []) {
    adapterStubs[source.stubFile] = scaffoldAdapter(source, pack.id);
  }

  return NextResponse.json({ pack, adapterStubs });
}
