import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getSettingValue } from "@niche-factory/db";

const Schema = z.object({
  subjects:   z.array(z.string()).min(1),
  yearGroup:  z.string(),
  curriculum: z.string().optional(),
});

// UK term structure — weeks 1-38
const TERMS = [
  { name: "Autumn 1", weeks: [1,2,3,4,5,6,7] },
  { name: "Autumn 2", weeks: [8,9,10,11,12,13,14,15] },
  { name: "Spring 1", weeks: [16,17,18,19,20] },
  { name: "Spring 2", weeks: [21,22,23,24,25,26] },
  { name: "Summer 1", weeks: [27,28,29,30,31,32] },
  { name: "Summer 2", weeks: [33,34,35,36,37,38] },
];

/**
 * POST /api/members/teacher-year-plan
 * Generate a full year curriculum map for the given subjects and year group.
 * Returns: { plan: { subject, week, term, topic }[] }
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input = Schema.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }

  const { subjects, yearGroup, curriculum } = input.data;
  const curriculumNote = curriculum ? ` following the ${curriculum}` : "";

  const [apiKey, model] = await Promise.all([
    (process.env["ANTHROPIC_API_KEY"] ?? getSettingValue("anthropic.apiKey").catch(() => null)),
    getSettingValue("anthropic.model").catch(() => null),
  ]);
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const client = new Anthropic({ apiKey });

  const termSummary = TERMS.map((t) => `${t.name}: weeks ${t.weeks[0]}–${t.weeks[t.weeks.length - 1]}`).join(", ");

  const prompt = `You are an experienced curriculum planner. Generate a full academic year plan for a teacher${curriculumNote}.

Year group: ${yearGroup}
Subjects: ${subjects.join(", ")}
Term structure: ${termSummary} (38 teaching weeks total)

For each subject, provide a topic/unit title for every week of the year.
Topics should follow a logical curriculum progression — units build on each other, with revision before assessments, and appropriate pacing across terms.

Return ONLY valid JSON — no extra text, no markdown fences:
{
  "plan": [
    { "subject": "English", "week": 1, "term": "Autumn 1", "topic": "Introduction to narrative writing" },
    { "subject": "English", "week": 2, "term": "Autumn 1", "topic": "Character development" },
    ...
  ]
}

Generate an entry for every combination of subject × week (${subjects.length} subjects × 38 weeks = ${subjects.length * 38} entries).`;

  let text: string;
  try {
    const message = await client.messages.create({
      model: model ?? "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const block = message.content[0];
    text = block?.type === "text" ? block.text : "";
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI failed" }, { status: 502 });
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "AI returned non-JSON", raw: text }, { status: 502 });
  }

  let result: unknown;
  try { result = JSON.parse(jsonMatch[0]); } catch {
    return NextResponse.json({ error: "Failed to parse AI JSON" }, { status: 502 });
  }

  return NextResponse.json(result);
}
