/**
 * inngest/functions.ts — Inngest background functions for Niche Factory.
 *
 * Functions registered here:
 *   1. run-scheduled-agents — cron: every 5 minutes, polls agent_schedules for
 *      due runs and dispatches runAgent() for each.
 *   2. run-agent-manually — event-driven, fires when "agent/run.requested" is
 *      sent. Useful for queuing long runs out of band.
 */
import { inngest } from "./client.js";
import { listDueSchedules, updateScheduleAfterRun } from "@niche-factory/db";
import { runAgent } from "@niche-factory/agent-runtime";
import type { JsonValue } from "@niche-factory/agent-runtime";

/**
 * Calculate the next run time from a cron expression.
 * For simplicity we use a fixed 5-minute advance if the cron is "* * * * *",
 * otherwise we advance by 1 hour as a safe default. A full cron parser can be
 * added when more complex schedules are needed.
 */
function nextRunAt(cron: string): Date {
  const next = new Date();
  const fiveMin = cron === "*/5 * * * *" || cron === "* * * * *";
  next.setMinutes(next.getMinutes() + (fiveMin ? 5 : 60));
  return next;
}

// ─── 1. Scheduled agent poller ────────────────────────────────────────────────

export const runScheduledAgents = inngest.createFunction(
  {
    id: "run-scheduled-agents",
    name: "Run Scheduled Agents",
    // Prevent multiple concurrent executions of the poller
    concurrency: { limit: 1 },
  },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    const due = await step.run("fetch-due-schedules", () => listDueSchedules());

    if (due.length === 0) {
      return { ran: 0 };
    }

    const results = await Promise.allSettled(
      due.map((schedule) =>
        step.run(`run-agent-${schedule.id}`, async () => {
          const result = await runAgent({
            agentDefId: schedule.agentDefId,
            customerId: schedule.customerId,
            trigger: "scheduled",
            input: (schedule.defaultInput ?? {}) as Record<string, JsonValue>,
          });

          await updateScheduleAfterRun(schedule.id, nextRunAt(schedule.cron));

          return { scheduleId: schedule.id, runId: result.runId, status: result.status };
        }),
      ),
    );

    const summary = results.map((r) =>
      r.status === "fulfilled" ? r.value : { error: String(r.reason) },
    );

    return { ran: due.length, summary };
  },
);

// ─── 2. Event-driven agent trigger ───────────────────────────────────────────

interface RunAgentRequestedEvent {
  name: "agent/run.requested";
  data: {
    agentDefId: string;
    customerId: string;
    input?: Record<string, unknown>;
    notionToken?: string;
    nicheId?: string;
  };
}

export const runAgentManually = inngest.createFunction(
  {
    id: "run-agent-manually",
    name: "Run Agent (Manual Event)",
    retries: 2,
  },
  { event: "agent/run.requested" },
  async ({ event, step }) => {
    const { agentDefId, customerId, input, notionToken, nicheId } =
      (event as RunAgentRequestedEvent).data;

    const result = await step.run("execute-agent", () =>
      runAgent({
        agentDefId,
        customerId,
        trigger: "manual",
        ...(input !== undefined ? { input: input as Record<string, JsonValue> } : {}),
        ...(notionToken !== undefined ? { notionToken } : {}),
        ...(nicheId !== undefined ? { nicheId } : {}),
      }),
    );

    return { runId: result.runId, status: result.status };
  },
);
