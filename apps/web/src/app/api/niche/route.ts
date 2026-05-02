import { NextRequest, NextResponse } from "next/server";
import { NichePackSchema } from "@niche-factory/schema";
import { listNichePacks, upsertNichePack } from "@niche-factory/db";

// GET /api/niche — list all niche packs
export async function GET() {
  try {
    const rows = await listNichePacks();
    return NextResponse.json({ nichePacks: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "DB error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/niche — create or update a niche pack
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = NichePackSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: result.error.issues },
      { status: 422 },
    );
  }

  try {
    const row = await upsertNichePack(result.data);
    return NextResponse.json({ nichePack: row }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "DB error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
