import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { listTools } from "@niche-factory/agent-tools";
import type { ToolContext, JsonValue } from "@niche-factory/agent-tools";
import { getSettingValue, listNichePacks, getLatestDeployByNiche, getLatestAppWorkspaceByNiche, getUserCriteria, findOrCreateCustomer, getCustomerCredits, deductCredits, listAppWorkspacesByUser } from "@niche-factory/db";
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

## Search limits (IMPORTANT)

You have a hard cap of **4 tool calls** per response. Use them wisely.
- Do NOT repeat a search with only a slightly different query if the first returned no useful results.
- If you cannot find the specific data after 2 searches (e.g. prices that vendors don't publish online), \
STOP searching and tell the user clearly: what you did find, why the data isn't available (e.g. "most photographers don't list prices publicly"), \
and what they should do instead (e.g. "contact them directly for a quote").
- Never burn all searches trying to find information that simply isn't on the web.

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

async function resolveSerperKey(email: string): Promise<string | undefined> {
  const customerKey = await getSettingValue(`customer.${email}.serper.apiKey`);
  if (customerKey?.trim()) return customerKey.trim();
  const globalKey = await getSettingValue("serper.apiKey");
  if (globalKey?.trim()) return globalKey.trim();
  return process.env["SERPER_API_KEY"];
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

  const activeNicheId = typeof (body as Record<string, unknown>)["nicheId"] === "string"
    ? (body as Record<string, unknown>)["nicheId"] as string
    : undefined;

  // Optional upfront credit cost (e.g. honeymoon search = 3 credits flat)
  const upfrontCredits = typeof (body as Record<string, unknown>)["upfrontCredits"] === "number"
    ? (body as Record<string, unknown>)["upfrontCredits"] as number
    : 0;

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

  // ── Credits check ────────────────────────────────────────────────────────
  // Ensure customer row exists (so credits column is populated), then gate.
  await findOrCreateCustomer(userEmail).catch(() => null);
  const currentCredits = await getCustomerCredits(userEmail).catch(() => 0);
  const requiredCredits = upfrontCredits > 0 ? upfrontCredits : 1;
  if (currentCredits < requiredCredits) {
    return new Response(
      JSON.stringify({ error: "no_credits", message: "You have no credits left. Top up to continue." }),
      { status: 402, headers: { "Content-Type": "application/json" } },
    );
  }

  // Deduct upfront credits immediately (flat-rate requests like honeymoon search)
  if (upfrontCredits > 0) {
    await deductCredits(userEmail, upfrontCredits).catch(() => null);
  }

  const [apiKey, model, serperKey] = await Promise.all([resolveApiKey(userEmail), resolveModel(), resolveSerperKey(userEmail)]);
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Agent not configured — ANTHROPIC_API_KEY is missing." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  // Resolve only the allowed tools that are actually registered
  // In-app users don't have a Notion token — strip out all Notion tools
  const notionToken = (session as unknown as Record<string, unknown>)["notionToken"] as
    | string
    | undefined;
  const hasAnyAppWorkspaces =
    (await listAppWorkspacesByUser(userEmail).catch(() => [])).length > 0;
  const isInApp = !notionToken || hasAnyAppWorkspaces;
  const allowedToolIds = isInApp
    ? MEMBER_TOOL_IDS.filter((id) => !id.startsWith("notion_"))
    : MEMBER_TOOL_IDS;
  const allTools = listTools();
  const memberTools = allTools.filter((t) => allowedToolIds.includes(t.name));

  const notionUserId = (session as unknown as Record<string, unknown>)["notionUserId"] as string | undefined;
  const toolContext: ToolContext = {
    notionToken,
    customerId: userEmail,
    apiKeys: {
      ...(serperKey ? { SERPER_API_KEY: serperKey } : {}),
    },
  };

  // Build system prompt with deployed database context
  let systemPrompt = BASE_SYSTEM_PROMPT;
  try {
    const packs = await listNichePacks();
    const criteriaKey = notionUserId ?? userEmail;

    // Sort packs so the active niche always comes first
    const sortedPacks = activeNicheId
      ? [...packs].sort((a, b) => (a.id === activeNicheId ? -1 : b.id === activeNicheId ? 1 : 0))
      : packs;

    // Inject active niche banner
    if (activeNicheId) {
      const activePack = packs.find((p) => p.id === activeNicheId);
      if (activePack) {
        const activePackName = (activePack.schemaSnapshot as unknown as NichePack).name;
        systemPrompt += `\n\n## Active Niche\nThe user is currently working on the **${activePackName}** template. Tailor all searches and suggestions to this niche unless the user says otherwise.`;
      }
    }

    const deployedSections: string[] = [];

    for (const packRow of sortedPacks) {
      const pack = packRow.schemaSnapshot as unknown as NichePack;
      const isActive = packRow.id === activeNicheId;

      if (isInApp) {
        // In-app: load from app_workspaces / app_databases
        const workspace = await getLatestAppWorkspaceByNiche(userEmail, packRow.id);
        if (!workspace) continue;
        const dbMap = workspace.databaseIdMap as Record<string, string> | null | undefined;
        if (!dbMap || Object.keys(dbMap).length === 0) continue;
        const lines: string[] = [isActive ? `**${pack.name}** ← ACTIVE` : `**${pack.name}**`];
        for (const db of pack.databases) {
          const appDbId = dbMap[db.id];
          if (typeof appDbId === "string") {
            const propList = db.properties.map((p) => `${p.name} (${p.type})`).join(", ");
            lines.push(`- ${db.name} → database_id: \`${appDbId}\``);
            lines.push(`  Properties: ${propList}`);
          }
        }
        if (lines.length > 1) deployedSections.push(lines.join("\n"));
      } else {
        // Notion: load from deploys
        const deploy = await getLatestDeployByNiche(packRow.id, notionUserId);
        if (deploy === undefined) continue;
        const dbMap = deploy.databaseIdMap as Record<string, string> | null | undefined;
        if (dbMap === null || dbMap === undefined || Object.keys(dbMap).length === 0) continue;
        const lines: string[] = [isActive ? `**${pack.name}** ← ACTIVE` : `**${pack.name}**`];
        for (const db of pack.databases) {
          const notionDbId = dbMap[db.id];
          if (typeof notionDbId === "string") {
            const propList = db.properties.map((p) => `${p.name} (${p.type})`).join(", ");
            lines.push(`- ${db.name} → database_id: \`${notionDbId}\``);
            lines.push(`  Properties: ${propList}`);
          }
        }
        if (lines.length > 1) deployedSections.push(lines.join("\n"));
      }
    }

    if (deployedSections.length > 0) {
      const sectionHeader = isInApp
        ? "\n\n## Deployed Workspace Databases\nUse these database IDs with the save tools:\n\n"
        : "\n\n## Deployed Notion Databases\nUse these database IDs directly with notion_create, notion_query, and notion_write:\n\n";
      systemPrompt += sectionHeader + deployedSections.join("\n\n");
    }

    // Add user's setup criteria — active niche first, clearly separated
    if (criteriaKey) {
      const activeCritLines: string[] = [];
      const otherCritLines: string[] = [];

      for (const packRow of sortedPacks) {
        const crit = await getUserCriteria(criteriaKey, packRow.id).catch(() => undefined);
        if (!crit) continue;
        const pack = packRow.schemaSnapshot as unknown as NichePack;
        const entries = Object.entries(crit.criteria as Record<string, unknown>)
          .filter(([, v]) => v !== null && v !== undefined && v !== "")
          .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? (v as unknown[]).join(", ") : String(v)}`);
        if (entries.length === 0) continue;
        const block = `**${pack.name}**\n${entries.join("\n")}`;
        if (packRow.id === activeNicheId) {
          activeCritLines.push(block);
        } else {
          otherCritLines.push(block);
        }
      }

      if (activeCritLines.length > 0) {
        systemPrompt +=
          "\n\n## Current Niche Setup\nUse this location and preferences for all searches:\n\n" +
          activeCritLines.join("\n\n");
      }
      if (otherCritLines.length > 0) {
        systemPrompt +=
          "\n\n## Other Niche Setups (for reference only)\n\n" +
          otherCritLines.join("\n\n");
      }
      // Fallback when no active niche specified
      if (activeCritLines.length === 0 && otherCritLines.length > 0) {
        systemPrompt +=
          "\n\n## User's Setup\nUnless the user explicitly specifies otherwise, use this location and preferences for all searches:\n\n" +
          otherCritLines.join("\n\n");
      }
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
        const maxTurns = 4;
        const maxToolCalls = 4;
        let totalInput = 0;
        let totalOutput = 0;
        let totalToolCalls = 0;

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

          // Guard: if this batch would exceed the total tool call cap, stop the loop
          totalToolCalls += toolUseBlocks.length;
          if (totalToolCalls > maxToolCalls) {
            enqueue({ type: "text", content: "I wasn't able to find the information you need within the allowed number of searches. The data may not be publicly available online — try contacting vendors directly for pricing or specific details." });
            enqueue({ type: "done", tokenUsage: { input: totalInput, output: totalOutput } });
            break;
          }

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

              // Deduct 1 credit per tool invocation (skip if upfront credits already charged)
              if (upfrontCredits === 0) {
                const newBalance = await deductCredits(userEmail, 1).catch(() => null);
                if (newBalance !== null) {
                  enqueue({ type: "credits_updated", credits: newBalance });
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
