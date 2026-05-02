import { describe, it, expect, beforeEach } from "vitest";
import {
  registerAdapter,
  getAdapter,
  getNicheAdapters,
  clearRegistry,
} from "./registry.js";
import type { DataAdapter } from "./interface.js";

function makeAdapter(niche: string, id: string): DataAdapter<string, string> {
  return {
    id,
    niche,
    description: `${id} adapter`,
    requiredCredentials: [],
    async *fetch() { yield "item"; },
    normalize: (raw) => raw.toUpperCase(),
    cacheKey: (row) => row,
  };
}

describe("adapter registry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("registers and retrieves an adapter", () => {
    const a = makeAdapter("real-estate", "zillow");
    registerAdapter(a);
    expect(getAdapter("real-estate", "zillow")).toBe(a);
  });

  it("throws for unknown adapter", () => {
    expect(() => getAdapter("real-estate", "unknown")).toThrow(/not registered/);
  });

  it("overwrites on duplicate registration (last-write-wins)", () => {
    const a1 = makeAdapter("re", "rss");
    const a2 = makeAdapter("re", "rss");
    registerAdapter(a1);
    registerAdapter(a2);
    expect(getAdapter("re", "rss")).toBe(a2);
  });

  it("getNicheAdapters returns all adapters for a niche", () => {
    registerAdapter(makeAdapter("re", "a"));
    registerAdapter(makeAdapter("re", "b"));
    registerAdapter(makeAdapter("other", "c"));
    const reAdapters = getNicheAdapters("re");
    expect(reAdapters).toHaveLength(2);
    expect(reAdapters.map((a) => a.id).sort()).toEqual(["a", "b"]);
  });

  it("getNicheAdapters returns empty array for unknown niche", () => {
    expect(getNicheAdapters("unknown")).toEqual([]);
  });
});
