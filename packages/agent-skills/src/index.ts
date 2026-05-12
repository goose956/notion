/**
 * index.ts — public API for @niche-factory/agent-skills
 */
export type { Skill, SkillContext, SkillFrontmatter, SkillInputField, JsonValue } from "./types.js";
export { parseFrontmatter, buildInputSchema } from "./loader.js";
export { registerSkill, getSkill, listSkills, resolveSkills } from "./registry.js";
