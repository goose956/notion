/**
 * loop.ts — multi-turn Claude tool_use agent loop.
 *
 * Runs a conversation with Claude, dispatching tool calls to registered skills
 * until Claude produces a final text response (no more tool_use blocks) or
 * the turn limit / timeout is reached.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Skill, SkillContext } from "@niche-factory/agent-tools";

export interface LoopOptions {
  /** Initialised Anthropic client with the correct API key */
  client: Anthropic;
  /** Model to use (e.g. "claude-sonnet-4-5") */
  model: string;
  /** System prompt from the agent definition */
  systemPrompt: string;
  /** Initial user message / task description */
  userMessage: string;
  /** Skills available as tools in this run */
  skills: Skill[];
  /** Context forwarded to every skill handler */
  skillContext: SkillContext;
  /** Maximum number of agent turns (default: 10) */
  maxTurns?: number;
  /** Timeout in ms for the whole loop (default: 60000) */
  timeoutMs?: number;
}

export interface LoopResult {
  /** Final text response from Claude */
  finalText: string;
  /** IDs of Notion pages the agent wrote to (collected from notion_write results) */
  notionArtifacts: string[];
  /** Accumulated token usage */
  tokenUsage: { input: number; output: number; total: number };
  /** Whether the loop ended due to timeout */
  timedOut: boolean;
}

/** Extract Notion page IDs from a notion_write tool result string */
function extractNotionArtifacts(toolName: string, resultText: string): string[] {
  if (toolName !== "notion_write") return [];
  // Result format: "Successfully updated properties [...] on page <PAGE_ID>."
  const match = /on page ([a-zA-Z0-9-]+)\.?$/.exec(resultText);
  return match?.[1] !== undefined ? [match[1]] : [];
}

export async function runAgentLoop(opts: LoopOptions): Promise<LoopResult> {
  const {
    client,
    model,
    systemPrompt,
    userMessage,
    skills,
    skillContext,
    maxTurns = 10,
    timeoutMs = 60_000,
  } = opts;

  const tools: Anthropic.Tool[] = skills.map((s) => ({
    name: s.name,
    description: s.description,
    input_schema: s.inputSchema,
  }));

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let turns = 0;
  let timedOut = false;
  const notionArtifacts: string[] = [];
  const tokenUsage = { input: 0, output: 0, total: 0 };
  const deadline = Date.now() + timeoutMs;

  while (turns < maxTurns) {
    if (Date.now() > deadline) {
      timedOut = true;
      break;
    }

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    });

    // Accumulate token usage
    tokenUsage.input += response.usage.input_tokens;
    tokenUsage.output += response.usage.output_tokens;
    tokenUsage.total += response.usage.input_tokens + response.usage.output_tokens;

    // Add assistant turn to conversation
    messages.push({ role: "assistant", content: response.content });

    turns++;

    // If Claude is done (no tool_use blocks), return final text
    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      const finalText = textBlock?.type === "text" ? textBlock.text : "";
      return { finalText, notionArtifacts, tokenUsage, timedOut: false };
    }

    // Process tool_use blocks
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    if (toolUseBlocks.length === 0) {
      // No tool use and not end_turn — extract any text and exit
      const textBlock = response.content.find((b) => b.type === "text");
      const finalText = textBlock?.type === "text" ? textBlock.text : "";
      return { finalText, notionArtifacts, tokenUsage, timedOut: false };
    }

    // Execute all tool calls and build tool_result content
    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (block) => {
        const skill = skills.find((s) => s.name === block.name);

        if (skill === undefined) {
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: `Error: unknown tool "${block.name}"`,
          };
        }

        let resultText: string;
        try {
          const inputArgs = (block.input ?? {}) as Record<string, import("@niche-factory/agent-skills").JsonValue>;
          resultText = await skill.handler(inputArgs, skillContext);
        } catch (err) {
          resultText = `Error executing ${block.name}: ${err instanceof Error ? err.message : String(err)}`;
        }

        // Collect Notion artifacts
        const artifacts = extractNotionArtifacts(block.name, resultText);
        notionArtifacts.push(...artifacts);

        return {
          type: "tool_result" as const,
          tool_use_id: block.id,
          content: resultText,
        };
      }),
    );

    // Add user turn with tool results
    messages.push({ role: "user", content: toolResults });
  }

  // Loop ended without a final response (max turns or timeout)
  let lastAssistantMsg: Anthropic.MessageParam | undefined;
  for (let j = messages.length - 1; j >= 0; j--) {
    if (messages[j]?.role === "assistant") { lastAssistantMsg = messages[j]; break; }
  }
  const lastContent = Array.isArray(lastAssistantMsg?.content)
    ? (lastAssistantMsg.content as Anthropic.ContentBlock[])
    : [];
  const lastText = lastContent.find((b): b is Anthropic.TextBlock => b.type === "text");

  return {
    finalText: lastText?.text ?? "(agent stopped without a final response)",
    notionArtifacts,
    tokenUsage,
    timedOut,
  };
}
