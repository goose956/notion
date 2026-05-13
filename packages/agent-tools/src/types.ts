/**
 * types.ts — shared types for the agent tools system.
 *
 * A Skill is a TypeScript-backed, SKILL.md-documented tool that an
 * agent can invoke via Claude's tool_use mechanism.
 */
import type Anthropic from "@anthropic-ai/sdk";

/** JSON-serialisable value */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** A single input field declared in SKILL.md frontmatter */
export interface ToolInputField {
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required?: boolean;
}

/** Parsed SKILL.md frontmatter */
export interface ToolFrontmatter {
  name: string;
  description: string;
  inputs: Record<string, ToolInputField>;
  when_to_use: string;
}

/** Runtime context passed to every tool handler */
export interface ToolContext {
  /** Notion OAuth token for the current customer */
  notionToken: string | undefined;
  /** Which customer is running this agent */
  customerId: string;
  /** Optional niche scoping */
  nicheId?: string;
  /**
   * Additional API keys resolved from DB settings or env vars.
   * Keys are env-var style, e.g. "SERPER_API_KEY", "RESEND_API_KEY", "APIFY_TOKEN".
   * Tools should prefer ctx.apiKeys["MY_KEY"] ?? process.env["MY_KEY"].
   */
  apiKeys?: Record<string, string>;
}

/** A fully resolved tool ready to register with the agent loop */
export interface Skill {
  /** Matches `name` in SKILL.md frontmatter — used as Claude tool name */
  name: string;
  /** Short description passed to Claude */
  description: string;
  /** Claude-compatible tool input_schema */
  inputSchema: Anthropic.Tool["input_schema"];
  /**
   * The handler function invoked when Claude calls this tool.
   * Returns a string result that is fed back to Claude as the tool result.
   */
  handler: (args: Record<string, JsonValue>, ctx: ToolContext) => Promise<string>;
}

/** @deprecated Use ToolContext instead */
export type SkillContext = ToolContext;
/** @deprecated Use ToolInputField instead */
export type SkillInputField = ToolInputField;
/** @deprecated Use ToolFrontmatter instead */
export type SkillFrontmatter = ToolFrontmatter;

