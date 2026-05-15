import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { listTools } from "@niche-factory/agent-tools";
import type { ToolContext, JsonValue } from "@niche-factory/agent-tools";
import { getSettingValue, listNichePacks, getLatestDeployByNiche } from "@niche-factory/db";
import type { NichePack } from "@niche-factory/schema";

/**
 * Tools members are allowed to use via the chat interface.
 */
const MEMBER_TOOL_IDS = [
  "web_search",
  "fetch_url",
  "notion_query",
  "notion_create",
  "notion_write",
  "notion_archive",
];

const BASE_SYSTEM_PROMPT = `You are a research assistant for Niche Factory members. \
Help members find venues, vendors, businesses, and other items for their projects.

Use web_search and fetch_url proactively to get current data. \
Be concise — skip filler phrases and get straight to results.

## Response format

When the user asks for a list of items (venues, vendors, businesses, places, etc.) \
that could be saved to a database, respond with:
1. One brief sentence summarising what you found.
2. A JSON code block containing an array of objects. Use the EXACT Notion property names \
as JSON keys (provided in the Deployed Databases section below). Include only properties \
that have real values — omit fields you have no data for.

Example:
Found 3 florists in Manchester with strong reviews.
\`\`\`json
[{"Vendor Name": "Bloom & Co", "Category": "Florist", "Website": "https://bloom.co.uk", "Phone": "0161 123 4567", "Rating": 4.8, "Notes": "Award-winning, min spend £500"}]
\`\`\`

For conversational questions, answer normally without a JSON block.`;

function sseChunk(data: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

async function resolveApiKey(email: string): Promise<string | undefined> {
  // Check customer-scoped key first, then global, then env var
  const customerKey = await getSettingValue(`customer.${email}.anthropic.apiKey`);
  if (customerKey?.trim()) return customerKey.trim();
  const globalKey = await getSettingValue("anthropic.apiKey");
  if (globalKey?.trim()) return globalKey.trim();
  return process.env["ANTHROPIC_API_KEY"];
}

async function resolveModel(): Promise<string> {
  const model = await getSettingValue("anthropic.model");
  if (model?.trim()) return model.trim();
  return process.env["ANTHROPIC_MODEL"] ?? "claude-haiku-4-5";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (typeof body !== "object" || body === null || !Array.isArray((body as Record<string, unknown>)["messages"])) {
    return new Response("messages array required", { status: 400 });
  }

  const rawMessages = (body as { messages: unknown[] }).messages;
  const messages: Anthropic.MessageParam[] = rawMessages.filter(
    (m): m is { role: "user" | "assistant"; content: string } =>
      typeof m === "object" &&
      m !== null &&
      ((m as Record<string, unknown>)["role"] === "user" ||
        (m as Record<string, unknown>)["role"] === "assistant") &&
      typeof (m as Record<string, unknown>)["content"] === "string",
  ).map((m) => ({ role: m.role, content: m.content }));

  if (messages.length === 0) {
    return new Response("No valid messages", { status: 400 });
  }

  const userEmail = session.user.email ?? "member";
  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Agent not configured — ANTHROPIC_API_KEY is missing." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  // Resolve only the allowed tools that are actually registered
  const allTools = listTools();
  const memberTools = allTools.filter((t) => MEMBER_TOOL_IDS.includes(t.name));

  const notionToken = (session as unknown as Record<string, unknown>)["notionToken"] as
    | string
    | undefined;
  const toolContext: ToolContext = {
    notionToken,
    customerId: userEmail,
  };

  // Build system prompt with deployed database context
  const notionUserId = (session as unknown as Record<string, unknown>)["notionUserId"] as string | undefined;
  let systemPrompt = BASE_SYSTEM_PROMPT;
  try {
    const packs = await listNichePacks();
    const deployedSections: string[] = [];
    for (const packRow of packs) {
      const deploy = await getLatestDeployByNiche(packRow.id, notionUserId);
      if (deploy === undefined) continue;
      const dbMap = deploy.databaseIdMap as Record<string, string> | null | undefined;
      if (dbMap === null || dbMap === undefined || Object.keys(dbMap).length === 0) continue;
      const pack = packRow.schemaSnapshot as unknown as NichePack;
      const lines: string[] = [`**${pack.name}**`];
      for (const db of pack.databases) {
        const notionDbId = dbMap[db.id];
        if (typeof notionDbId === "string") {
          const propList = db.properties
            .map((p) => `${p.name} (${p.type})`)
            .join(", ");
          lines.push(`- ${db.name} → database_id: \`${notionDbId}\``);
          lines.push(`  Properties: ${propList}`);
        }
      }
      if (lines.length > 1) deployedSections.push(lines.join("\n"));
    }
    if (deployedSections.length > 0) {
      systemPrompt +=
        "\n\n## Deployed Notion Databases\nUse these database IDs directly with notion_create, notion_query, and notion_write:\n\n" +
        deployedSections.join("\n\n");
    }
  } catch {
    // Non-fatal — proceed without DB context
  }

  const anthropicTools: Anthropic.Tool[] = memberTools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));

  const client = new Anthropic({ apiKey });

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: Record<string, unknown>) => {
        controller.enqueue(sseChunk(data));
      };

      try {
        const history: Anthropic.MessageParam[] = [...messages];
        const maxTurns = 8;
        let totalInput = 0;
        let totalOutput = 0;

        for (let turn = 0; turn < maxTurns; turn++) {
          const response = await client.messages.create({
            model: model,
            max_tokens: 4096,
            system: systemPrompt,
            ...(anthropicTools.length > 0 ? { tools: anthropicTools } : {}),
            messages: history,
          });

          totalInput += response.usage.input_tokens;
          totalOutput += response.usage.output_tokens;

          // End turn — extract final text and return
          if (
            response.stop_reason === "end_turn" ||
            !response.content.some((b) => b.type === "tool_use")
          ) {
            const textBlock = response.content.find((b) => b.type === "text");
            const text = textBlock?.type === "text" ? textBlock.text : "";
            enqueue({ type: "text", content: text });
            enqueue({ type: "done", tokenUsage: { input: totalInput, output: totalOutput } });
            break;
          }

          // Add assistant's response (with tool_use blocks) to history
          history.push({ role: "assistant", content: response.content });

          const toolUseBlocks = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
          );

          // Execute each tool call, streaming activity events
          const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
            toolUseBlocks.map(async (block) => {
              enqueue({ type: "tool_start", name: block.name, args: block.input });

              const skill = memberTools.find((s) => s.name === block.name);
              let result: string;
              if (skill === undefined) {
                result = `Error: tool "${block.name}" is not available.`;
              } else {
                try {
                  result = await skill.handler(
                    block.input as Record<string, JsonValue>,
                    toolContext,
                  );
                } catch (err) {
                  result = `Error: ${err instanceof Error ? err.message : String(err)}`;
                }
              }

              enqueue({ type: "tool_end", name: block.name });

              return {
                type: "tool_result" as const,
                tool_use_id: block.id,
                content: result,
              };
            }),
          );

          history.push({ role: "user", content: toolResults });
        }
      } catch (err) {
        enqueue({
          type: "error",
          message: err instanceof Error ? err.message : "An error occurred.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
