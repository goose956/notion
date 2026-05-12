import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";

const EnrichRequestSchema = z.object({
  /** The Notion page ID to enrich */
  pageId: z.string().min(1),
  /** The enrichment prompt template — use {{FIELD_NAME}} for substitution */
  prompt: z.string().min(1),
  /** Values to substitute into the prompt */
  context: z.record(z.string(), z.string()).optional(),
  /** The Notion property name to write the result back to (rich_text) */
  targetProperty: z.string().min(1),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const sessionRecord = session as Record<string, unknown> | null;

  const body: unknown = await req.json();
  const parsed = EnrichRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { pageId, prompt, context, targetProperty } = parsed.data;

  // Resolve customer identity from session
  const customerId =
    typeof sessionRecord?.["notionUserId"] === "string"
      ? sessionRecord["notionUserId"]
      : typeof (sessionRecord?.["user"] as Record<string, unknown> | undefined)?.["email"] ===
          "string"
        ? ((sessionRecord?.["user"] as Record<string, unknown>)["email"] as string)
        : "anonymous";

  const notionToken =
    typeof sessionRecord?.["notionToken"] === "string"
      ? sessionRecord["notionToken"]
      : process.env["NOTION_TOKEN"];

  const { runAgent } = await import("@niche-factory/agent-runtime");

  let agentResult: Awaited<ReturnType<typeof runAgent>>;
  try {
    agentResult = await runAgent({
      agentDefId: "default-enrichment-agent",
      customerId,
      trigger: "api",
      input: { pageId, prompt, context: context ?? {}, targetProperty },
      ...(notionToken !== undefined ? { notionToken } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent run failed";
    // Surface missing API key as 503 to preserve backward compat
    if (message.includes("No Anthropic API key")) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (agentResult.status === "failed") {
    return NextResponse.json(
      { error: agentResult.errorMessage ?? "Agent run failed" },
      { status: 502 },
    );
  }

  const enriched =
    typeof agentResult.output["result"] === "string" ? agentResult.output["result"] : "";

  // If the agent wrote to Notion, return plain success
  if (agentResult.notionArtifacts.length > 0) {
    return NextResponse.json({ enriched });
  }

  // Agent ran but didn't write (no notionToken or write error captured as text)
  // Check if the result text contains a write error indicator
  if (enriched.includes("Error writing to Notion:")) {
    const writeError = enriched.split("Error writing to Notion:")[1]?.trim() ?? "Notion write failed";
    // Return the actual enriched text minus the error suffix, or fall back to the full string
    return NextResponse.json({ enriched, writeError }, { status: 207 });
  }

  return NextResponse.json({ enriched });
}

