/**
 * custom-tool-builder.ts — builds a Skill object from a DB custom_tools row.
 *
 * Currently supports tool_type = "webhook":
 *   Posts the agent's tool_use args as JSON to the configured URL.
 *   Returns the response body (up to 2000 chars).
 *
 * Future tool types can be added here (e.g. "llm_transform", "js_snippet").
 */
import type { Skill, JsonValue } from "./types.js";

export type CustomToolConfig = {
  /** For tool_type = "webhook" */
  url?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH";
  /** Extra headers to send (e.g. Authorization) */
  headers?: Record<string, string>;
};

export type CustomToolRow = {
  id: string;
  name: string;
  description: string;
  toolType: string;
  config: unknown;
  inputSchema: unknown;
  enabled: boolean;
};

/**
 * Given a DB row from custom_tools, returns a Skill that can be passed
 * to resolveTools() or directly to runAgentLoop().
 *
 * Returns null if the tool_type is not supported or config is invalid.
 */
export function buildCustomTool(row: CustomToolRow): Skill | null {
  if (!row.enabled) return null;

  if (row.toolType === "webhook") {
    return buildWebhookTool(row);
  }

  // Unknown type — return null (will be ignored by loader)
  return null;
}

function buildWebhookTool(row: CustomToolRow): Skill {
  const cfg = (row.config ?? {}) as CustomToolConfig;
  const url = cfg.url ?? "";
  const method = cfg.method ?? "POST";
  const extraHeaders = cfg.headers ?? {};

  return {
    name: row.name,
    description: row.description,
    inputSchema: (row.inputSchema ?? { type: "object", properties: {} }) as Skill["inputSchema"],
    async handler(args: Record<string, JsonValue>): Promise<string> {
      if (!url.trim()) {
        return `Error: tool "${row.name}" has no webhook URL configured. Edit it in Admin → Tools.`;
      }

      const fetchInit: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...extraHeaders,
        },
        signal: AbortSignal.timeout(30_000),
      };

      if (method !== "GET") {
        fetchInit.body = JSON.stringify(args);
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
}

/** @deprecated Use buildCustomTool instead */
export const buildCustomSkill = buildCustomTool;
/** @deprecated Use CustomToolConfig instead */
export type CustomSkillConfig = CustomToolConfig;
/** @deprecated Use CustomToolRow instead */
export type CustomSkillRow = CustomToolRow;
