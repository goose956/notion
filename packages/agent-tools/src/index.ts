/**
 * index.ts — public API for @niche-factory/agent-tools
 */
export type { Skill, ToolContext, ToolFrontmatter, ToolInputField, JsonValue } from "./types.js";
export type { SkillContext, SkillInputField, SkillFrontmatter } from "./types.js"; // deprecated aliases
export { parseFrontmatter, buildInputSchema } from "./loader.js";
export { registerTool, getTool, listTools, resolveTools } from "./registry.js";
export { registerSkill, getSkill, listSkills, resolveSkills } from "./registry.js"; // deprecated aliases
export { buildCustomTool } from "./custom-tool-builder.js";
export { buildCustomSkill } from "./custom-tool-builder.js"; // deprecated alias
export type { CustomToolRow, CustomToolConfig } from "./custom-tool-builder.js";
export type { CustomSkillRow, CustomSkillConfig } from "./custom-tool-builder.js"; // deprecated aliases
