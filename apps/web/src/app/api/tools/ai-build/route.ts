import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getSettingValue } from "@niche-factory/db";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a tool-builder assistant for Niche Factory, an AI-powered Notion workflow platform.

Your job is to help admin users create "tools" — reusable capabilities that AI agents can call to carry out tasks.

A tool can be any of these types:
- **webhook** — POSTs a JSON payload to an HTTP endpoint (Zapier, Make, n8n, a custom API, etc.)
- **python** — a Python script that runs server-side; receives input as a dict, returns a string result
- **sql** — a parameterised SQL SELECT query run against the app's own PostgreSQL database
- **http_scraper** — fetches and parses a URL, returns the page content
- **llm_chain** — calls Claude with a prompt template, returns the AI's response

When chatting:
1. Ask focused, practical questions to understand what the user wants to achieve
2. Suggest the most appropriate tool type based on their answers
3. Be concrete — ask for specifics like URLs, what data to pass, what the output looks like
4. Once you have enough detail, say "I have everything I need — here's the tool I'll create:" and output a JSON block

When you are ready to create the tool, you MUST end your response with exactly this format — nothing after it:

[TOOL_READY]
{
  "id": "snake_case_id",
  "name": "snake_case_id",
  "description": "Clear description for the AI agent — when to use this and what it returns",
  "toolType": "webhook|python|sql|http_scraper|llm_chain",
  "config": {},
  "inputSchema": {
    "type": "object",
    "properties": {
      "param_name": { "type": "string", "description": "What this param is" }
    },
    "required": ["param_name"]
  }
}
[/TOOL_READY]

For each tool type, the config should contain:
- webhook: { "url": "...", "method": "POST", "headers": {} }
- python: { "code": "def run(args):\\n    # your code\\n    return str(result)" }
- sql: { "query": "SELECT ... FROM ... WHERE col = $1", "params_map": ["param_name"] }
- http_scraper: { "url_template": "https://example.com/{path}", "selector": "article" }
- llm_chain: { "prompt_template": "You are a... Given: {input}, respond with..." }

Keep your questions conversational and brief. Usually 1–3 questions before you have enough to build.`;

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1),
});

/**
 * POST /api/tools/ai-build
 * Conversational AI tool builder. Returns a streaming text response.
 */
export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const { messages } = parsed.data;

  const apiKey = (await getSettingValue("anthropic.apiKey")) ?? process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
  }
  const model = (await getSettingValue("anthropic.model")) ?? "claude-sonnet-4-5";

  const client = new Anthropic({ apiKey });

  const stream = await client.messages.stream({
    model,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
