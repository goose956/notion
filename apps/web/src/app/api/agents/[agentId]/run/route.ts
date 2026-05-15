import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";

const RunAgentBodySchema = z.object({
  customerId: z.string().min(1).optional(),
  input: z.record(z.unknown()).optional(),
  nicheId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: { agentId: string } },
): Promise<NextResponse> {
  const session = await auth();

  const agentId = context.params.agentId;
  if (!agentId || agentId.trim() === "") {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  const body: unknown = await req.json();
  const parsed = RunAgentBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Resolve the customer ID: explicitly provided, or from session
  const sessionRecord = session as unknown as Record<string, unknown> | null;
  const sessionUserId =
    typeof sessionRecord?.["notionUserId"] === "string"
      ? sessionRecord["notionUserId"]
      : typeof (session as unknown as Record<string, unknown> | null)?.["user"] === "object"
        ? (
            (session as unknown as Record<string, unknown> | null)?.["user"] as
              | Record<string, unknown>
              | undefined
          )?.["email"] ?? "anonymous"
        : "anonymous";

  const customerId =
    (parsed.data.customerId ?? (typeof sessionUserId === "string" ? sessionUserId : undefined)) ??
    "anonymous";

  const notionToken =
    typeof sessionRecord?.["notionToken"] === "string"
      ? sessionRecord["notionToken"]
      : undefined;

  // Import lazily to avoid cold-start penalty when route loads
  const { runAgent } = await import("@niche-factory/agent-runtime");

  try {
    const result = await runAgent({
      agentDefId: agentId,
      customerId,
      trigger: "manual",
      ...(parsed.data.input !== undefined ? { input: parsed.data.input as Record<string, import("@niche-factory/agent-runtime").JsonValue> } : {}),
      ...(notionToken !== undefined ? { notionToken } : {}),
      ...(parsed.data.nicheId !== undefined ? { nicheId: parsed.data.nicheId } : {}),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent run failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
