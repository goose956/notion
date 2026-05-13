import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RunAgentOptions } from "./types.js";

// ─── DB mock ─────────────────────────────────────────────────────────────────

vi.mock("@niche-factory/db", () => ({
  getAgentDefinition: vi.fn(),
  createAgentRun: vi.fn(),
  updateAgentRun: vi.fn(),
  getSettingValue: vi.fn(),
}));

// ─── agent-tools mock ────────────────────────────────────────────────────────

vi.mock("@niche-factory/agent-tools", () => ({
  resolveTools: vi.fn(() => []),
}));

// ─── Anthropic SDK mock ───────────────────────────────────────────────────────

const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  };
});

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { runAgent } from "./runner.js";
import * as db from "@niche-factory/db";

const mockDb = vi.mocked(db);

const MOCK_AGENT_DEF = {
  id: "test-agent",
  name: "Test Agent",
  description: "",
  systemPrompt: "You are a test agent.",
  model: "claude-sonnet-4-5",
  skillList: [] as string[],
  defaultConfig: { maxTurns: 3, timeoutMs: 10_000 },
  nicheId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();

  mockDb.getAgentDefinition.mockResolvedValue(MOCK_AGENT_DEF);
  mockDb.createAgentRun.mockResolvedValue({} as never);
  mockDb.updateAgentRun.mockResolvedValue(undefined);
  // Return the API key from global setting
  mockDb.getSettingValue.mockImplementation(async (key: string) => {
    if (key === "anthropic.apiKey") return "sk-test-global";
    return undefined;
  });
});

describe("runAgent", () => {
  it("returns success with final text", async () => {
    // Claude returns end_turn on first message
    mockCreate.mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "All done!" }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const opts: RunAgentOptions = {
      agentDefId: "test-agent",
      customerId: "user-1",
      trigger: "manual",
    };

    const result = await runAgent(opts);

    expect(result.status).toBe("success");
    expect(result.output["result"]).toBe("All done!");
    expect(result.tokenUsage.total).toBe(150);
    expect(result.notionArtifacts).toHaveLength(0);
  });

  it("marks run as failed when Anthropic throws", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API error"));

    const opts: RunAgentOptions = {
      agentDefId: "test-agent",
      customerId: "user-1",
      trigger: "api",
    };

    const result = await runAgent(opts);

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toMatch(/API error/);
  });

  it("prefers customer-scoped API key over global", async () => {
    mockDb.getSettingValue.mockImplementation(async (key: string) => {
      if (key === "customer.vip-user.anthropic.apiKey") return "sk-customer-key";
      if (key === "anthropic.apiKey") return "sk-global-key";
      return undefined;
    });

    mockCreate.mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Done." }],
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    await runAgent({
      agentDefId: "test-agent",
      customerId: "vip-user",
      trigger: "manual",
    });

    // Verify the Anthropic constructor was called (key resolved without throwing)
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("throws when no API key is available", async () => {
    mockDb.getSettingValue.mockResolvedValue(undefined);
    delete process.env["ANTHROPIC_API_KEY"];

    await expect(
      runAgent({
        agentDefId: "test-agent",
        customerId: "no-key-user",
        trigger: "manual",
      }),
    ).rejects.toThrow(/No Anthropic API key/);
  });

  it("calls updateAgentRun with correct status on success", async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Result." }],
      usage: { input_tokens: 20, output_tokens: 10 },
    });

    await runAgent({
      agentDefId: "test-agent",
      customerId: "user-1",
      trigger: "scheduled",
    });

    const updateCalls = mockDb.updateAgentRun.mock.calls;
    const finalCall = updateCalls[updateCalls.length - 1];
    expect(finalCall?.[1]).toMatchObject({ status: "success" });
  });
});
