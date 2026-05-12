/**
 * enrich.ts — runs an AI prompt against context values, returns generated text.
 *
 * NOTE: This skill does NOT need to call Anthropic directly. It is always
 * invoked inside an agent loop that already has a Claude conversation in
 * progress. Claude generates the enriched text as the tool_result and returns
 * it directly — this handler just renders the prompt and signals Claude to use
 * it. The actual generation is performed by the outer agent loop.
 *
 * In practice the handler renders the template and returns instructions to
 * Claude to generate the enriched text following the prompt.
 */
import type { Skill, SkillContext, JsonValue } from "../../src/types.js";

/** Replace {{KEY}} placeholders in the template with context values */
function renderTemplate(template: string, context: Record<string, JsonValue>): string {
  let result = template;
  for (const [key, value] of Object.entries(context)) {
    const placeholder = `{{${key.toUpperCase()}}}`;
    const replacement = typeof value === "string" ? value : JSON.stringify(value);
    result = result.split(placeholder).join(replacement);
  }
  return result;
}

export const enrichRecordSkill: Skill = {
  name: "enrich_record",
  description:
    "Renders a prompt template with context values and returns the prompt text for Claude to respond to. Does NOT write to Notion — use notion_write for that.",
  inputSchema: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "Prompt template. Use {{VARIABLE_NAME}} for substitutions.",
      },
      context: {
        type: "object",
        description: "Key-value map substituted into the prompt (replaces {{KEY}} with value).",
      },
      max_tokens: {
        type: "number",
        description: "Hint for maximum response length in tokens. Defaults to 1024.",
      },
    },
    required: ["prompt"],
  },
  async handler(args, _ctx: SkillContext): Promise<string> {
    const promptTemplate = args["prompt"];
    const contextRaw = args["context"];
    const maxTokens = typeof args["max_tokens"] === "number" ? args["max_tokens"] : 1024;

    if (typeof promptTemplate !== "string" || promptTemplate.trim() === "") {
      return "Error: prompt must be a non-empty string.";
    }

    const context: Record<string, JsonValue> =
      typeof contextRaw === "object" && contextRaw !== null && !Array.isArray(contextRaw)
        ? (contextRaw as Record<string, JsonValue>)
        : {};

    const renderedPrompt = renderTemplate(promptTemplate, context);

    // Return the rendered prompt as a structured instruction so that the
    // outer agent loop's Claude context picks it up and generates a response.
    // The agent runner treats this result as enriched content ready to write.
    return [
      `ENRICHMENT_PROMPT (max ${maxTokens} tokens):`,
      renderedPrompt,
      "",
      "Please respond with ONLY the enriched content — no preamble, no explanation.",
    ].join("\n");
  },
};
