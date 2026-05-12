/**
 * types.ts — public types for @niche-factory/agent-runtime
 */
import type { JsonValue } from "@niche-factory/agent-skills";

export type { JsonValue };

/** What triggered this agent run */
export type AgentTrigger = "manual" | "api" | "scheduled";

/** Options passed to runAgent() */
export interface RunAgentOptions {
  /** The agent definition ID from agent_definitions table */
  agentDefId: string;
  /** Customer identifier (used for key lookup and DB logging) */
  customerId: string;
  /** What triggered the run */
  trigger: AgentTrigger;
  /** Arbitrary JSON input passed to the agent (merged into system context) */
  input?: Record<string, JsonValue>;
  /**
   * Customer's Notion OAuth token — needed for notion_write / notion_query skills.
   * If omitted, those skills will return an error to Claude instead of throwing.
   */
  notionToken?: string;
  /**
   * Optional niche context — narrows skill behaviour and logged on the run.
   */
  nicheId?: string;
}

/** The result returned by runAgent() */
export interface AgentRunResult {
  /** UUID of the agent_runs row */
  runId: string;
  /** Final status */
  status: "success" | "failed" | "timeout";
  /** Total input + output tokens consumed */
  tokenUsage: { input: number; output: number; total: number };
  /** Estimated cost in USD (string for precision) */
  costUsd: string;
  /** Wall-clock ms for the entire run */
  durationMs: number;
  /**
   * Structured output from the last assistant message.
   * Shape depends on the agent's task — typically the final text response.
   */
  output: Record<string, JsonValue>;
  /** IDs of any Notion pages the agent wrote to */
  notionArtifacts: string[];
  /** Error message if status is "failed" */
  errorMessage?: string;
}
