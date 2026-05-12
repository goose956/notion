import { NextRequest, NextResponse } from "next/server";
import { listAgentRunsByDef } from "@niche-factory/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { agentId: string } },
) {
  const rows = await listAgentRunsByDef(params.agentId);
  return NextResponse.json(rows);
}
