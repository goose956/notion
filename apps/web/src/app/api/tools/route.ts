import { NextResponse } from "next/server";
import { listTools } from "@niche-factory/agent-tools";

export async function GET() {
  const tools = listTools().map((s) => ({
    name: s.name,
    description: s.description,
    inputSchema: s.inputSchema,
  }));

  return NextResponse.json(tools);
}
