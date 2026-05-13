-- Migration 0007: rename skills → tools in DB schema
-- Renames custom_skills table to custom_tools,
-- renames skill_type column to tool_type,
-- and renames skill_list column in agent_definitions to tool_list.

ALTER TABLE custom_skills RENAME TO custom_tools;
ALTER TABLE custom_tools RENAME COLUMN skill_type TO tool_type;
ALTER TABLE agent_definitions RENAME COLUMN skill_list TO tool_list;
