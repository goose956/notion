import { describe, it, expect, vi } from "vitest";
import { runAdapter } from "./runner.js";
import type { DataAdapter } from "@niche-factory/adapter-runtime";
import type { NotionApiClient } from "@niche-factory/notion-client";

function makeClient(pagesCreateFn = vi.fn().mockResolvedValue({ id: "page-1" })) {
  return {
    call: vi.fn((fn: (c: { pages: { create: typeof pagesCreateFn } }) => unknown) =>
      fn({ pages: { create: pagesCreateFn } }),
    ),
  } as unknown as NotionApiClient;
}

describe("runAdapter", () => {
  it("processes items and writes to Notion", async () => {
    const items = [
      { title: "Row A", price: 100 },
      { title: "Row B", price: 200 },
    ];

    const adapter: DataAdapter<(typeof items)[0], (typeof items)[0]> = {
      id: "test",
      niche: "test-niche",
      description: "test",
      requiredCredentials: [],
      async *fetch() { yield* items; },
      normalize: (raw) => raw,
      cacheKey: (row) => row.title,
    };

    const client = makeClient();
    const seenKeys = new Set<string>();

    const result = await runAdapter(adapter, client, {
      databaseIds: { "test-db": "notion-db-id" },
      credentials: {},
      targetDatabaseId: "test-db",
      seenKeys,
    }, {});

    expect(result.rowsProcessed).toBe(2);
    expect(result.rowsSkipped).toBe(0);
    expect(result.error).toBeUndefined();
    expect(seenKeys.size).toBe(2);
  });

  it("skips items already in seenKeys", async () => {
    const adapter: DataAdapter<string, string> = {
      id: "test",
      niche: "test-niche",
      description: "test",
      requiredCredentials: [],
      async *fetch() { yield "item-1"; yield "item-2"; },
      normalize: (raw) => raw,
      cacheKey: (row) => row,
    };

    const client = makeClient();
    const seenKeys = new Set<string>(["item-1"]); // item-1 already seen

    const result = await runAdapter(adapter, client, {
      databaseIds: { "db": "notion-id" },
      credentials: {},
      targetDatabaseId: "db",
      seenKeys,
    }, {});

    expect(result.rowsProcessed).toBe(1);
    expect(result.rowsSkipped).toBe(1);
  });

  it("returns error when targetDatabaseId not in databaseIds map", async () => {
    const adapter: DataAdapter<string, string> = {
      id: "test",
      niche: "test-niche",
      description: "test",
      requiredCredentials: [],
      async *fetch() { yield "x"; },
      normalize: (raw) => raw,
      cacheKey: (row) => row,
    };

    const result = await runAdapter(adapter, makeClient(), {
      databaseIds: {},
      credentials: {},
      targetDatabaseId: "missing-db",
      seenKeys: new Set(),
    }, {});

    expect(result.rowsProcessed).toBe(0);
    expect(result.error).toContain("missing-db");
  });

  it("captures adapter fetch errors gracefully", async () => {
    const adapter: DataAdapter<string, string> = {
      id: "test",
      niche: "test-niche",
      description: "test",
      requiredCredentials: [],
      async *fetch() { throw new Error("Network error"); },
      normalize: (raw) => raw,
      cacheKey: (row) => row,
    };

    const result = await runAdapter(adapter, makeClient(), {
      databaseIds: { "db": "notion-id" },
      credentials: {},
      targetDatabaseId: "db",
      seenKeys: new Set(),
    }, {});

    expect(result.error).toBe("Network error");
  });
});
