import { describe, it, expect } from "vitest";
import { buildPropertiesForCreate, buildProperty } from "./property-builders.js";
import type { Property } from "@niche-factory/schema";

describe("buildProperty", () => {
  it("builds a title property", () => {
    const prop: Property = { type: "title", name: "Name" };
    const result = buildProperty(prop);
    expect(result).toEqual({ title: {} });
  });

  it("builds a number property with format", () => {
    const prop: Property = { type: "number", name: "Price", format: "dollar" };
    const result = buildProperty(prop);
    expect(result).toEqual({ number: { format: "dollar" } });
  });

  it("builds a select property with options", () => {
    const prop: Property = {
      type: "select",
      name: "Status",
      options: [{ name: "Active", color: "green" }],
    };
    const result = buildProperty(prop);
    expect(result).toMatchObject({
      select: { options: [{ name: "Active", color: "green" }] },
    });
  });

  it("builds a formula property", () => {
    const prop: Property = { type: "formula", name: "Score", expression: "prop('Price') * 0.7" };
    const result = buildProperty(prop);
    expect(result).toEqual({ formula: { expression: "prop('Price') * 0.7" } });
  });

  it("builds a checkbox property", () => {
    const prop: Property = { type: "checkbox", name: "Done" };
    const result = buildProperty(prop);
    expect(result).toEqual({ checkbox: {} });
  });

  it("returns null for relation (deferred to pass 2)", () => {
    const prop: Property = { type: "relation", name: "Related", targetDatabaseId: "db-1" };
    const result = buildProperty(prop);
    expect(result).toBeNull();
  });
});

describe("buildPropertiesForCreate", () => {
  it("splits relations into deferredRelations", () => {
    const properties: Property[] = [
      { type: "title", name: "Name" },
      { type: "number", name: "Price" },
      { type: "relation", name: "Comps", targetDatabaseId: "comps-db" },
    ];

    const { notionProperties, deferredRelations } = buildPropertiesForCreate(properties);

    expect("Name" in notionProperties).toBe(true);
    expect("Price" in notionProperties).toBe(true);
    expect("Comps" in notionProperties).toBe(false);
    expect(deferredRelations).toHaveLength(1);
    expect(deferredRelations[0]?.name).toBe("Comps");
    expect(deferredRelations[0]?.targetDatabaseId).toBe("comps-db");
  });
});
