/**
 * inngest/client.ts — shared Inngest client instance.
 *
 * Env vars:
 *   INNGEST_EVENT_KEY  — your Inngest event key (required in production)
 *   INNGEST_SIGNING_KEY — used to verify Inngest webhook requests
 */
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "niche-factory",
  name: "Niche Factory",
});
