/**
 * api/inngest/route.ts — Inngest webhook handler.
 *
 * Inngest calls this endpoint to deliver events and coordinate function runs.
 * Required env vars:
 *   INNGEST_EVENT_KEY   — sign outgoing events
 *   INNGEST_SIGNING_KEY — verify incoming Inngest webhook requests
 */
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { runScheduledAgents, runAgentManually, syncNotionDaily, syncNotionWeekly } from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runScheduledAgents, runAgentManually, syncNotionDaily, syncNotionWeekly],
});
