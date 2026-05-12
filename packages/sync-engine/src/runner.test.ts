import { describe, it, expect, vi } from "vitest";
import { runAdapter } from "./runner.js";
import type { DataAdapter } from "@niche-factory/adapter-runtime";
import type { NotionApiClient } from "@niche-factory/notion-client";

function makeClient(
  pagesCreateFn = vi.fn().mockResolvedValue({ id: "page-1" }),
  databaseProperties: Record<string, { type: string }> = {
    Name: { type: "title" },
  },
) {
  const databasesRetrieveFn = vi.fn().mockResolvedValue({ properties: databaseProperties });
  return {
    call: vi.fn(
      (fn: (c: {
        pages: { create: typeof pagesCreateFn };
        databases: { retrieve: typeof databasesRetrieveFn };
      }) => unknown) =>
        fn({
          pages: { create: pagesCreateFn },
          databases: { retrieve: databasesRetrieveFn },
        }),
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

  it("maps values to typed Notion properties", async () => {
    const pagesCreate = vi.fn().mockResolvedValue({ id: "page-1" });
    const adapter: DataAdapter<
      { business: string },
      {
        "Business Name": string;
        "Website": string;
        "Phone": string;
        "Status": string;
        "Imported At": string;
        "Rating": number;
      }
    > = {
      id: "typed",
      niche: "test-niche",
      description: "test",
      requiredCredentials: [],
      async *fetch() {
        yield { business: "Acme Co" };
      },
      normalize: () => ({
        "Business Name": "Acme Co",
        "Website": "https://acme.example",
        "Phone": "+1 555 123 4567",
        "Status": "Not started",
        "Imported At": "2026-05-11T00:00:00.000Z",
        "Rating": 4.8,
      }),
      cacheKey: (row) => row["Business Name"],
    };

    const client = makeClient(pagesCreate, {
      "Business Name": { type: "title" },
      "Website": { type: "url" },
      "Phone": { type: "phone_number" },
      "Status": { type: "status" },
      "Imported At": { type: "date" },
      "Rating": { type: "number" },
    });

    const result = await runAdapter(adapter, client, {
      databaseIds: { leads: "notion-leads-db" },
      credentials: {},
      targetDatabaseId: "leads",
      seenKeys: new Set<string>(),
    }, {});

    expect(result.error).toBeUndefined();
    expect(result.rowsProcessed).toBe(1);

    const payload = pagesCreate.mock.calls[0]?.[0] as {
      properties: Record<string, unknown>;
    };
    expect(payload.properties["Business Name"]).toMatchObject({
      title: [{ text: { content: "Acme Co" } }],
    });
    expect(payload.properties["Website"]).toEqual({ url: "https://acme.example" });
    expect(payload.properties["Phone"]).toEqual({ phone_number: "+1 555 123 4567" });
    expect(payload.properties["Status"]).toEqual({ status: { name: "Not started" } });
    expect(payload.properties["Rating"]).toEqual({ number: 4.8 });
    expect(payload.properties["Imported At"]).toMatchObject({
      date: { start: "2026-05-11T00:00:00.000Z" },
    });
  });
});
