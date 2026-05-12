/**
 * send-email.ts — sends an email via the Resend API.
 *
 * API key: RESEND_API_KEY (set in admin Settings or environment variable)
 * Get a free key at https://resend.com
 */
import type { Skill, SkillContext, JsonValue } from "../../src/types.js";

const DEFAULT_FROM = "Niche Factory Agent <agent@niche-factory.com>";

type ResendResponse = { id?: string; message?: string };

export const sendEmailSkill: Skill = {
  name: "send_email",
  description:
    "Send a plain-text email via Resend. Use for notifications, summaries, or reports.",
  inputSchema: {
    type: "object",
    properties: {
      to: {
        type: "string",
        description: "Recipient email address.",
      },
      subject: {
        type: "string",
        description: "Email subject line.",
      },
      body: {
        type: "string",
        description: "Plain text email body.",
      },
      from: {
        type: "string",
        description: `Sender address (must be from a verified Resend domain, default: "${DEFAULT_FROM}").`,
      },
    },
    required: ["to", "subject", "body"],
  },
  async handler(args: Record<string, JsonValue>, ctx: SkillContext): Promise<string> {
    const apiKey =
      ctx.apiKeys?.["RESEND_API_KEY"] ?? process.env["RESEND_API_KEY"];

    if (!apiKey) {
      return (
        "Error: RESEND_API_KEY is not configured. " +
        "Add it in Admin → Settings → Email API Key, or set the RESEND_API_KEY environment variable. " +
        "Get a free key at https://resend.com"
      );
    }

    const to = typeof args["to"] === "string" ? args["to"].trim() : "";
    const subject = typeof args["subject"] === "string" ? args["subject"].trim() : "";
    const body = typeof args["body"] === "string" ? args["body"] : "";
    const from = typeof args["from"] === "string" && args["from"].trim()
      ? args["from"].trim()
      : DEFAULT_FROM;

    if (!to) return "Error: to (recipient email) is required.";
    if (!subject) return "Error: subject is required.";
    if (!body) return "Error: body is required.";

    let data: ResendResponse;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to, subject, text: body }),
        signal: AbortSignal.timeout(15_000),
      });

      data = (await res.json()) as ResendResponse;

      if (!res.ok) {
        return `Failed to send email: ${data.message ?? res.statusText}`;
      }
    } catch (err) {
      return `Error calling Resend API: ${err instanceof Error ? err.message : String(err)}`;
    }

    return `Email sent successfully to ${to}. Message ID: ${data.id ?? "unknown"}`;
  },
};
