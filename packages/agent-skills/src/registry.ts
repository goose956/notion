/**
 * registry.ts — in-memory skill registry.
 *
 * Skills are registered by name. The agent runner resolves skill names from
 * agent_definitions.skill_list and looks them up here.
 *
 * All built-in skills are registered at module load time.
 * Custom skills can be registered dynamically at runtime.
 */
import type { Skill } from "./types.js";
import { notionWriteSkill } from "../skills/notion_write/notion-write.js";
import { notionQuerySkill } from "../skills/notion_query/notion-query.js";
import { enrichRecordSkill } from "../skills/enrich_record/enrich.js";
import { webSearchSkill } from "../skills/web_search/web-search.js";
import { fetchUrlSkill } from "../skills/fetch_url/fetch-url.js";
import { sendEmailSkill } from "../skills/send_email/send-email.js";
import { callWebhookSkill } from "../skills/call_webhook/call-webhook.js";
import { runApifySkill } from "../skills/run_apify/run-apify.js";

const _registry = new Map<string, Skill>();

/** Register a skill. Throws if a skill with the same name is already registered. */
export function registerSkill(skill: Skill): void {
  if (_registry.has(skill.name)) {
    throw new Error(`Skill "${skill.name}" is already registered.`);
  }
  _registry.set(skill.name, skill);
}

/** Look up a registered skill by name. Returns undefined if not found. */
export function getSkill(name: string): Skill | undefined {
  return _registry.get(name);
}

/** Return all registered skills as an array. */
export function listSkills(): Skill[] {
  return Array.from(_registry.values());
}

/**
 * Resolve a list of skill names to Skill objects.
 * Throws if any name is not registered.
 */
export function resolveSkills(names: string[]): Skill[] {
  return names.map((name) => {
    const skill = _registry.get(name);
    if (skill === undefined) {
      throw new Error(
        `Skill "${name}" is not registered. Available: [${Array.from(_registry.keys()).join(", ")}]`,
      );
    }
    return skill;
  });
}

// Register all built-in skills
registerSkill(notionWriteSkill);
registerSkill(notionQuerySkill);
registerSkill(enrichRecordSkill);
registerSkill(webSearchSkill);
registerSkill(fetchUrlSkill);
registerSkill(sendEmailSkill);
registerSkill(callWebhookSkill);
registerSkill(runApifySkill);
