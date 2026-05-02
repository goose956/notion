import Anthropic from "@anthropic-ai/sdk";
import { NichePackSchema, type NichePack } from "@niche-factory/schema";
import { loadPrompt } from "./prompt-loader.js";

export interface GenerateOptions {
  nicheDescription: string;
  /** Anthropic API key. Defaults to process.env.ANTHROPIC_API_KEY */
  apiKey?: string;
  /** Claude model to use. Defaults to claude-3-5-sonnet-20241022 */
  model?: string;
}

/**
 * generate() — call the Claude API to draft a full niche pack.
 *
 * Returns a validated NichePack. Throws if the AI output fails schema validation.
 */
export async function generate(options: GenerateOptions): Promise<NichePack> {
  const apiKey = options.apiKey ?? process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const client = new Anthropic({ apiKey });
  const model = options.model ?? "claude-3-5-sonnet-20241022";

  const prompt = await loadPrompt("draft-niche-pack", {
    NICHE_DESCRIPTION: options.nicheDescription,
  });

  const message = await client.messages.create({
    model,
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI response contained no text block");
  }

  const rawJson = extractJson(textBlock.text);
  const parsed: unknown = JSON.parse(rawJson);
  return NichePackSchema.parse(parsed);
}

/**
 * Extract the first JSON object from a string.
 * Claude sometimes wraps output in markdown code fences.
 */
function extractJson(text: string): string {
  // Strip ```json ... ``` fences if present
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();
  // Otherwise assume the whole text is JSON
  return text.trim();
}
