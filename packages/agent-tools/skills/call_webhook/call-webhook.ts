/**
 * call-webhook.ts — makes an HTTP request to any external API or webhook.
 *
 * No API key required (unless the target endpoint needs one via headers).
 */
import type { Skill, SkillContext, JsonValue } from "../../src/types.js";

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH"]);

export const callWebhookSkill: Skill = {
  name: "call_webhook",
  description:
    "Make an HTTP request (GET/POST/PUT/PATCH) to any external API or webhook endpoint. Returns the response status and body.",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The full URL of the webhook or API endpoint.",
      },
      method: {
        type: "string",
        description: "HTTP method: GET, POST, PUT, or PATCH (default: POST).",
      },
      payload: {
        type: "object",
        description: "JSON body to send with the request (for POST/PUT/PATCH).",
      },
      headers: {
        type: "object",
        description: "Additional HTTP headers as key-value string pairs (e.g. Authorization).",
      },
    },
    required: ["url"],
  },
  async handler(args: Record<string, JsonValue>, _ctx: SkillContext): Promise<string> {
    const url = typeof args["url"] === "string" ? args["url"].trim() : "";
    if (!url) return "Error: url is required.";
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return "Error: url must start with http:// or https://";
    }

    const rawMethod = typeof args["method"] === "string"
      ? args["method"].toUpperCase()
      : "POST";
    const method = ALLOWED_METHODS.has(rawMethod) ? rawMethod : "POST";

    // Build custom headers (only string values)
    const extraHeaders: Record<string, string> = {};
    if (args["headers"] !== null && typeof args["headers"] === "object" && !Array.isArray(args["headers"])) {
      const h = args["headers"] as Record<string, JsonValue>;
      for (const [k, v] of Object.entries(h)) {
        if (typeof v === "string") extraHeaders[k] = v;
      }
    }

    const fetchInit: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      signal: AbortSignal.timeout(30_000),
    };

    // Attach body for non-GET
    if (method !== "GET" && args["payload"] !== undefined && args["payload"] !== null) {
      fetchInit.body = JSON.stringify(args["payload"]);
    }

    let responseText: string;
    let status: number;
    try {
      const res = await fetch(url, fetchInit);
      status = res.status;
      responseText = await res.text();
    } catch (err) {
      return `Error calling webhook: ${err instanceof Error ? err.message : String(err)}`;
    }

    const truncated = responseText.length > 2000;
    const body = responseText.slice(0, 2000) + (truncated ? "\n...[truncated]" : "");
    return `HTTP ${status}\n${body}`;
  },
};
