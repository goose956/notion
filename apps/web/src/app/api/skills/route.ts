import { NextResponse } from "next/server";
import { listSkills } from "@niche-factory/agent-skills";

export async function GET() {
  const skills = listSkills().map((s) => ({
    name: s.name,
    description: s.description,
    inputSchema: s.inputSchema,
  }));

  return NextResponse.json(skills);
}
