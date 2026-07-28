import { describe, it, expect } from "vitest";
import { NichePackSchema } from "./niche-pack.js";

const MINIMAL_PACK = {
  version: "1.0.0",
  id: "test-pack",
  name: "Test Pack",
  description: "A test niche pack",
  databases: [
    {
      id: "db-1",
      name: "Main Database",
      properties: [
        { type: "title", name: "Name" },
        { type: "rich_text", name: "Notes" },
      ],
    },
  ],
  dataSources: [
    {
      id: "my-source",
      label: "My Source",
      description: "Test source",
      stubFile: "sources/my-source.ts",
      requiredCredentials: [],
      targetDatabaseId: "db-1",
    },
  ],
};

describe("NichePackSchema", () => {
  it("accepts a valid minimal pack", () => {
    const result = NichePackSchema.safeParse(MINIMAL_PACK);
    expect(result.success).toBe(true);
  });

  it("rejects a pack with no databases", () => {
    const result = NichePackSchema.safeParse({
      ...MINIMAL_PACK,
      databases: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a pack with no data sources", () => {
    const result = NichePackSchema.safeParse({
      ...MINIMAL_PACK,
      dataSources: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a pack with an invalid property type", () => {
    const result = NichePackSchema.safeParse({
      ...MINIMAL_PACK,
      databases: [
        {
          id: "db-1",
          name: "DB",
          properties: [{ type: "not-a-real-type", name: "X" }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields as undefined", () => {
    const result = NichePackSchema.safeParse({
      ...MINIMAL_PACK,
      tagline: undefined,
      enrichmentPrompts: undefined,
      seedPages: undefined,
      onboardingQuestions: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("preserves all 22 property types in discriminated union", () => {
    const allTypes = [
      { type: "title", name: "Title" },
      { type: "rich_text", name: "Notes" },
      { type: "number", name: "Count" },
      { type: "select", name: "Status", options: [] },
      { type: "multi_select", name: "Tags", options: [] },
      { type: "status", name: "Progress" },
      { type: "date", name: "Due" },
      { type: "people", name: "Assigned" },
      { type: "files", name: "Attachments" },
      { type: "checkbox", name: "Done" },
      { type: "url", name: "Link" },
      { type: "email", name: "Email" },
      { type: "phone_number", name: "Phone" },
      { type: "formula", name: "Calc", expression: "1+1" },
      { type: "relation", name: "Related", targetDatabaseId: "db-1" },
      { type: "rollup", name: "Sum", relationPropertyName: "Related", rollupPropertyName: "Count", function: "sum" },
      { type: "created_time", name: "Created" },
      { type: "created_by", name: "Creator" },
      { type: "last_edited_time", name: "Edited" },
      { type: "last_edited_by", name: "Editor" },
      { type: "unique_id", name: "ID" },
      { type: "verification", name: "Verified" },
    ];

    const result = NichePackSchema.safeParse({
      ...MINIMAL_PACK,
      databases: [{ id: "db-1", name: "All Props", properties: allTypes }],
    });
    expect(result.success).toBe(true);
  });
});
