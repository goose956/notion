/**
 * runner.ts — runAgent() entry point.
 *
 * Single function used for both manual triggers (from the dashboard API route)
 * and scheduled triggers (from Inngest). It:
 *   1. Loads the agent definition from the DB
 *   2. Resolves the Anthropic API key (customer-scoped → global → env var)
 *   3. Resolves the model (agent def → global setting → hardcoded default)
 *   4. Resolves registered skills from agent_definitions.skill_list
 *   5. Creates an agent_runs row (status: pending)
 *   6. Runs the Claude tool_use loop
 *   7. Updates the agent_runs row with results, token usage, and cost
 *   8. Returns AgentRunResult
 */
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "node:crypto";
import {
  getAgentDefinition,
  createAgentRun,
  updateAgentRun,
  getSettingValue,
  listCustomTools,
} from "@niche-factory/db";
import { resolveTools, buildCustomTool } from "@niche-factory/agent-tools";
import type { ToolContext } from "@niche-factory/agent-tools";
import { runAgentLoop } from "./loop.js";
import type { RunAgentOptions, AgentRunResult, JsonValue } from "./types.js";

/** Approximate cost per million tokens (USD) — updated periodically */
const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  "claude-opus-4-5": { input: 15.0, output: 75.0 },
  "claude-sonnet-4-5": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 0.25, output: 1.25 },
  // Legacy model IDs
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
};

const DEFAULT_MODEL = "claude-sonnet-4-5";

function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): string {
  const rates = COST_PER_MILLION[model] ?? COST_PER_MILLION[DEFAULT_MODEL]!;
  const cost =
    (inputTokens / 1_000_000) * rates.input +
    (outputTokens / 1_000_000) * rates.output;
  return cost.toFixed(6);
}

/**
 * Resolve the Anthropic API key with fallback chain:
 *   1. customer.{customerId}.anthropic.apiKey (app_settings table)
 *   2. anthropic.apiKey (global app_settings)
 *   3. ANTHROPIC_API_KEY env var
 */
async function resolveApiKey(customerId: string): Promise<string> {
  const customerKey = await getSettingValue(`customer.${customerId}.anthropic.apiKey`);
  if (customerKey !== undefined && customerKey.trim() !== "") return customerKey.trim();

  const globalKey = await getSettingValue("anthropic.apiKey");
  if (globalKey !== undefined && globalKey.trim() !== "") return globalKey.trim();

  const envKey = process.env["ANTHROPIC_API_KEY"];
  if (envKey !== undefined && envKey.trim() !== "") return envKey.trim();

  throw new Error(
    `No Anthropic API key found. Set customer.${customerId}.anthropic.apiKey in settings, ` +
      "or the global anthropic.apiKey setting, or ANTHROPIC_API_KEY environment variable.",
  );
}

/**
 * Resolve the model with fallback chain:
 *   1. Agent definition's own model field
 *   2. anthropic.model global setting
 *   3. DEFAULT_MODEL constant
 */
async function resolveModel(agentModel: string): Promise<string> {
  if (agentModel !== "" && agentModel !== DEFAULT_MODEL) return agentModel;

  const globalModel = await getSettingValue("anthropic.model");
  if (globalModel !== undefined && globalModel.trim() !== "") return globalModel.trim();

  return DEFAULT_MODEL;
}

/**
 * Build the initial user message from run input.
 * Merges the agent's default_config with the per-run input.
 */
function buildUserMessage(
  input: Record<string, JsonValue> | undefined,
  defaultConfig: JsonValue,
): string {
  const merged: Record<string, JsonValue> = {};

  if (
    typeof defaultConfig === "object" &&
    defaultConfig !== null &&
    !Array.isArray(defaultConfig)
  ) {
    Object.assign(merged, defaultConfig as Record<string, JsonValue>);
  }

  if (input !== undefined) {
    Object.assign(merged, input);
  }

  if (Object.keys(merged).length === 0) {
    return "Please begin.";
  }

  return `Task input:\n${JSON.stringify(merged, null, 2)}\n\nPlease complete the task described in your system prompt.`;
}

/**
 * The single entry point for running an agent — used by both the API route
 * (manual trigger) and the Inngest scheduler (scheduled trigger).
 */
export async function runAgent(opts: RunAgentOptions): Promise<AgentRunResult> {
  const { agentDefId, customerId, trigger, input, notionToken, nicheId } = opts;

  // 1. Load agent definition
  const agentDef = await getAgentDefinition(agentDefId);
  if (agentDef === undefined) {
    throw new Error(`Agent definition "${agentDefId}" not found.`);
  }

  // 2. Resolve API key, model, and additional tool API keys
  const [apiKey, model, serperKey, resendKey, apifyToken] = await Promise.all([
    resolveApiKey(customerId),
    resolveModel(agentDef.model),
    getSettingValue("serper.apiKey"),
    getSettingValue("resend.apiKey"),
    getSettingValue("apify.token"),
  ]);

  // 3. Resolve tools — built-ins first, then custom tools from DB
  const toolList = Array.isArray(agentDef.toolList)
    ? (agentDef.toolList as string[])
    : [];

  // Separate built-in tool names from custom tool IDs
  const builtinNames = new Set(["notion_write", "notion_query", "enrich_record", "web_search", "fetch_url", "send_email", "call_webhook", "run_apify"]);
  const builtinToolIds = toolList.filter((id) => builtinNames.has(id));
  const customToolIds = toolList.filter((id) => !builtinNames.has(id));

  const builtinTools = resolveTools(builtinToolIds);

  // Load custom tools from DB (only the ones in this agent's tool_list)
  const allCustomRows = customToolIds.length > 0
    ? await listCustomTools(true)
    : [];
  const customToolObjects = allCustomRows
    .filter((row) => customToolIds.includes(row.id))
    .map((row) => buildCustomTool(row))
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const skills = [...builtinTools, ...customToolObjects];

  // 4. Create the agent_runs row (status: pending)
  const runId = randomUUID();
  const startedAt = new Date();

  await createAgentRun({
    id: runId,
    customerId,
    agentDefId,
    trigger,
    status: "pending",
    startedAt,
    input: (input ?? {}) as Record<string, unknown>,
    output: {},
    notionArtifacts: [],
    tokenUsage: {},
    costUsd: "0.000000",
  });

  // 5. Run the loop
  const apiKeys: Record<string, string> = {};
  if (serperKey !== undefined && serperKey.trim() !== "") apiKeys["SERPER_API_KEY"] = serperKey.trim();
  if (resendKey !== undefined && resendKey.trim() !== "") apiKeys["RESEND_API_KEY"] = resendKey.trim();
  if (apifyToken !== undefined && apifyToken.trim() !== "") apiKeys["APIFY_TOKEN"] = apifyToken.trim();
  // Also include env var fallbacks
  if (!apiKeys["SERPER_API_KEY"] && process.env["SERPER_API_KEY"]) apiKeys["SERPER_API_KEY"] = process.env["SERPER_API_KEY"]!;
  if (!apiKeys["RESEND_API_KEY"] && process.env["RESEND_API_KEY"]) apiKeys["RESEND_API_KEY"] = process.env["RESEND_API_KEY"]!;
  if (!apiKeys["APIFY_TOKEN"] && process.env["APIFY_TOKEN"]) apiKeys["APIFY_TOKEN"] = process.env["APIFY_TOKEN"]!;

  const toolContext: ToolContext = {
    notionToken,
    customerId,
    apiKeys,
    ...(nicheId !== undefined ? { nicheId } : {}),
  };
  const userMessage = buildUserMessage(
    input,
    agentDef.defaultConfig as JsonValue,
  );

  const maxTurns =
    typeof (agentDef.defaultConfig as Record<string, unknown>)["maxTurns"] === "number"
      ? ((agentDef.defaultConfig as Record<string, unknown>)["maxTurns"] as number)
      : 10;

  const timeoutMs =
    typeof (agentDef.defaultConfig as Record<string, unknown>)["timeoutMs"] === "number"
      ? ((agentDef.defaultConfig as Record<string, unknown>)["timeoutMs"] as number)
      : 60_000;

  let loopResult: Awaited<ReturnType<typeof runAgentLoop>>;
  let errorMessage: string | undefined;
  let status: "success" | "failed" | "timeout";

  try {
    await updateAgentRun(runId, { status: "running" });

    loopResult = await runAgentLoop({
      client: new Anthropic({ apiKey }),
      model,
      systemPrompt: agentDef.systemPrompt,
      userMessage,
      skills,
      skillContext: toolContext,
      maxTurns,
      timeoutMs,
    });

    status = loopResult.timedOut ? "timeout" : "success";
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    status = "failed";

    loopResult = {
      finalText: "",
      notionArtifacts: [],
      tokenUsage: { input: 0, output: 0, total: 0 },
      timedOut: false,
    };
  }

  // 6. Compute cost and duration
  const completedAt = new Date();
  const durationMs = completedAt.getTime() - startedAt.getTime();
  const costUsd = estimateCost(
    model,
    loopResult.tokenUsage.input,
    loopResult.tokenUsage.output,
  );

  const output: Record<string, JsonValue> = {
    result: loopResult.finalText,
  };

  // 7. Persist results
  await updateAgentRun(runId, {
    status,
    completedAt,
    output,
    notionArtifacts: loopResult.notionArtifacts,
    tokenUsage: loopResult.tokenUsage as Record<string, unknown>,
    costUsd,
    durationMs,
    errorMessage: errorMessage ?? null,
  });

  const result: AgentRunResult = {
    runId,
    status,
    tokenUsage: loopResult.tokenUsage,
    costUsd,
    durationMs,
    output,
    notionArtifacts: loopResult.notionArtifacts,
  };
  if (errorMessage !== undefined) result.errorMessage = errorMessage;
  return result;
}
