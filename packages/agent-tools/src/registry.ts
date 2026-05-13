/**
 * registry.ts — in-memory tool registry.
 *
 * Tools are registered by name. The agent runner resolves tool names from
 * agent_definitions.tool_list and looks them up here.
 *
 * All built-in tools are registered at module load time.
 * Custom tools can be registered dynamically at runtime.
 */
import type { Skill } from "./types.js";
import { notionArchiveSkill } from "../skills/notion_archive/notion-archive.js";
import { notionCreateSkill } from "../skills/notion_create/notion-create.js";
import { notionWriteSkill } from "../skills/notion_write/notion-write.js";
import { notionQuerySkill } from "../skills/notion_query/notion-query.js";
import { enrichRecordSkill } from "../skills/enrich_record/enrich.js";
import { webSearchSkill } from "../skills/web_search/web-search.js";
import { fetchUrlSkill } from "../skills/fetch_url/fetch-url.js";
import { sendEmailSkill } from "../skills/send_email/send-email.js";
import { callWebhookSkill } from "../skills/call_webhook/call-webhook.js";
import { runApifySkill } from "../skills/run_apify/run-apify.js";

const _registry = new Map<string, Skill>();

/** Register a tool. Throws if a tool with the same name is already registered. */
export function registerTool(skill: Skill): void {
  if (_registry.has(skill.name)) {
    throw new Error(`Tool "${skill.name}" is already registered.`);
  }
  _registry.set(skill.name, skill);
}

/** Look up a registered tool by name. Returns undefined if not found. */
export function getTool(name: string): Skill | undefined {
  return _registry.get(name);
}

/** Return all registered tools as an array. */
export function listTools(): Skill[] {
  return Array.from(_registry.values());
}

/**
 * Resolve a list of tool names to Skill objects.
 * Throws if any name is not registered.
 */
export function resolveTools(names: string[]): Skill[] {
  return names.map((name) => {
    const skill = _registry.get(name);
    if (skill === undefined) {
      throw new Error(
        `Tool "${name}" is not registered. Available: [${Array.from(_registry.keys()).join(", ")}]`,
      );
    }
    return skill;
  });
}

/** @deprecated Use registerTool instead */
export const registerSkill = registerTool;
/** @deprecated Use getTool instead */
export const getSkill = getTool;
/** @deprecated Use listTools instead */
export const listSkills = listTools;
/** @deprecated Use resolveTools instead */
export const resolveSkills = resolveTools;

// Register all built-in tools
registerTool(notionArchiveSkill);
registerTool(notionCreateSkill);
registerTool(notionWriteSkill);
registerTool(notionQuerySkill);
registerTool(enrichRecordSkill);
registerTool(webSearchSkill);
registerTool(fetchUrlSkill);
registerTool(sendEmailSkill);
registerTool(callWebhookSkill);
registerTool(runApifySkill);

