import { describe, it, expect } from "vitest";
import { parseFrontmatter, buildInputSchema } from "./loader.js";

const SAMPLE_SKILL_MD = `---
name: test_skill
description: A skill used in tests.
inputs:
  page_id:
    type: string
    description: The page to act on.
    required: true
  score:
    type: number
    description: Optional score value.
  enabled:
    type: boolean
    description: Toggle flag.
when_to_use: Only in tests.
---

## test_skill

Body content is ignored by the parser.
`;

describe("parseFrontmatter", () => {
  it("parses name and description", () => {
    const fm = parseFrontmatter(SAMPLE_SKILL_MD);
    expect(fm.name).toBe("test_skill");
    expect(fm.description).toBe("A skill used in tests.");
    expect(fm.when_to_use).toBe("Only in tests.");
  });

  it("parses input field types and descriptions", () => {
    const fm = parseFrontmatter(SAMPLE_SKILL_MD);
    expect(fm.inputs["page_id"]).toEqual({
      type: "string",
      description: "The page to act on.",
      required: true,
    });
    expect(fm.inputs["score"]).toEqual({
      type: "number",
      description: "Optional score value.",
      required: false,
    });
    expect(fm.inputs["enabled"]).toEqual({
      type: "boolean",
      description: "Toggle flag.",
      required: false,
    });
  });

  it("throws when frontmatter is missing", () => {
    expect(() => parseFrontmatter("no frontmatter here")).toThrow("missing YAML frontmatter");
  });

  it("throws when name is missing", () => {
    const noName = `---\ndescription: test\ninputs:\nwhen_to_use: yes\n---\n`;
    expect(() => parseFrontmatter(noName)).toThrow("missing required field: name");
  });
});

describe("buildInputSchema", () => {
  it("builds an Anthropic-compatible JSON schema", () => {
    const fm = parseFrontmatter(SAMPLE_SKILL_MD);
    const schema = buildInputSchema(fm.inputs);

    expect(schema.type).toBe("object");
    expect(schema.required).toContain("page_id");
    expect(schema.required).not.toContain("score");
    expect(schema.properties["page_id"]).toMatchObject({
      type: "string",
      description: "The page to act on.",
    });
  });

  it("returns empty required array when no fields are required", () => {
    const schema = buildInputSchema({
      foo: { type: "string", description: "bar", required: false },
    });
    expect(schema.required).toHaveLength(0);
  });
});
