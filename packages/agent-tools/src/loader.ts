/**
 * loader.ts â€” reads SKILL.md files and builds Skill definitions.
 *
 * SKILL.md format (YAML frontmatter + markdown body):
 *
 * ---
 * name: notion_write
 * description: Writes properties to a Notion page.
 * inputs:
 *   page_id:
 *     type: string
 *     description: The Notion page ID to update.
 *   properties:
 *     type: object
 *     description: Map of property name to value.
 * when_to_use: After generating enriched content, to persist it back to Notion.
 * ---
 *
 * The markdown body is documentation-only (not parsed at runtime).
 */
import type { ToolFrontmatter, ToolInputField } from "./types.js";

/** Extract YAML frontmatter between the first --- and second --- markers */
export function parseFrontmatter(raw: string): ToolFrontmatter {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (match === null) {
    throw new Error("SKILL.md is missing YAML frontmatter (--- ... ---)");
  }
  const yaml = match[1] ?? "";
  return parseYamlFrontmatter(yaml);
}

/**
 * Minimal YAML parser â€” only handles the subset used in SKILL.md files.
 * Supports top-level keys + one level of nested objects (for `inputs`).
 * Avoids a heavy YAML dependency for this small, controlled format.
 */
function parseYamlFrontmatter(yaml: string): ToolFrontmatter {
  const lines = yaml.split(/\r?\n/);

  let name = "";
  let description = "";
  let when_to_use = "";
  const inputs: Record<string, ToolInputField> = {};

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Top-level key: value
    const topMatch = line.match(/^([a-zA-Z_]+):\s*(.*)/);
    if (topMatch !== null) {
      const [, key, rawValue] = topMatch;
      const value = (rawValue ?? "").trim();

      if (key === "name") name = value;
      else if (key === "description") description = value;
      else if (key === "when_to_use") when_to_use = value;
      else if (key === "inputs") {
        // Parse the nested block of input definitions
        i++;
        while (i < lines.length) {
          const inputLine = lines[i] ?? "";
          // Input field name (2-space indent)
          const fieldMatch = inputLine.match(/^  ([a-zA-Z_]+):\s*$/);
          if (fieldMatch === null) break;

          const fieldName = fieldMatch[1] ?? "";
          const field: Partial<ToolInputField> = {};

          i++;
          while (i < lines.length) {
            const propLine = lines[i] ?? "";
            const propMatch = propLine.match(/^    ([a-zA-Z_]+):\s*(.*)/);
            if (propMatch === null) break;

            const [, propKey, propVal] = propMatch;
            const trimmedVal = (propVal ?? "").trim();

            if (propKey === "type") {
              field.type = trimmedVal as ToolInputField["type"];
            } else if (propKey === "description") {
              field.description = trimmedVal;
            } else if (propKey === "required") {
              field.required = trimmedVal === "true";
            }
            i++;
          }

          inputs[fieldName] = {
            type: field.type ?? "string",
            description: field.description ?? "",
            required: field.required ?? false,
          };
        }
        continue; // i already advanced inside the inputs block
      }
    }
    i++;
  }

  if (name === "") throw new Error("SKILL.md frontmatter is missing required field: name");
  if (description === "") throw new Error(`SKILL.md '${name}' is missing required field: description`);

  return { name, description, inputs, when_to_use };
}

/**
 * Build the Anthropic-compatible input_schema from SKILL.md inputs.
 */
export function buildInputSchema(
  inputs: Record<string, ToolInputField>,
): { type: "object"; properties: Record<string, unknown>; required: string[] } {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [fieldName, field] of Object.entries(inputs)) {
    properties[fieldName] = {
      type: field.type,
      description: field.description,
    };
    if (field.required === true) {
      required.push(fieldName);
    }
  }

  return { type: "object", properties, required };
}
