import Anthropic from "@anthropic-ai/sdk";
import { NichePackSchema, type NichePack } from "@niche-factory/schema";
import { loadPrompt } from "./prompt-loader.js";

export interface RefineOptions {
  currentPack: NichePack;
  feedback: string;
  apiKey?: string;
  model?: string;
}

export async function refine(options: RefineOptions): Promise<NichePack> {
  const apiKey = options.apiKey ?? process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const client = new Anthropic({ apiKey });
  const model = options.model ?? "claude-3-5-sonnet-20241022";

  const prompt = await loadPrompt("refine-niche-pack", {
    CURRENT_PACK: JSON.stringify(options.currentPack, null, 2),
    FEEDBACK: options.feedback,
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

  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(textBlock.text);
  const rawJson = fenceMatch?.[1]?.trim() ?? textBlock.text.trim();
  const parsed: unknown = JSON.parse(rawJson);
  return NichePackSchema.parse(parsed);
}
