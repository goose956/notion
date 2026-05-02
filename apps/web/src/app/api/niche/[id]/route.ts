import { NextRequest, NextResponse } from "next/server";
import { getNichePack, deleteNichePack } from "@niche-factory/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const row = await getNichePack(params.id);
    if (row === undefined) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ nichePack: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "DB error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await deleteNichePack(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "DB error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
