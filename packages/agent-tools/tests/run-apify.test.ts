import { afterEach, describe, expect, it, vi } from "vitest";
import { runApifySkill } from "../skills/run_apify/run-apify.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runApifySkill", () => {
  it("uses authorization headers, current endpoints, and run cost caps", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: "run-id" } }), {
          status: 201,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "run-id",
              status: "SUCCEEDED",
              defaultDatasetId: "dataset-id",
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: "post-id" }]), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await runApifySkill.handler(
      {
        actor_id: "xquik/x-tweet-scraper",
        input: {
          mode: "search",
          searchTerms: ["AI lang:en"],
          maxItems: 20,
        },
        max_items: 20,
        max_total_charge_usd: 1,
      },
      {
        notionToken: undefined,
        customerId: "customer-id",
        apiKeys: { APIFY_TOKEN: "test-token" },
      },
    );

    expect(JSON.parse(result)).toEqual([{ id: "post-id" }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const [startRequest, startInit] = fetchMock.mock.calls[0] as [
      URL,
      RequestInit,
    ];
    const startUrl = new URL(startRequest.toString());
    expect(startUrl.pathname).toBe(
      "/v2/actors/xquik~x-tweet-scraper/runs",
    );
    expect(startUrl.searchParams.get("maxItems")).toBe("20");
    expect(startUrl.searchParams.get("maxTotalChargeUsd")).toBe("1");
    expect(startUrl.searchParams.has("token")).toBe(false);
    expect(startInit.headers).toEqual({
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    });

    const [pollRequest, pollInit] = fetchMock.mock.calls[1] as [
      string,
      RequestInit,
    ];
    expect(pollRequest).toBe("https://api.apify.com/v2/actor-runs/run-id");
    expect(pollRequest).not.toContain("test-token");
    expect(pollInit.headers).toEqual({
      Authorization: "Bearer test-token",
    });

    const [datasetRequest, datasetInit] = fetchMock.mock.calls[2] as [
      URL,
      RequestInit,
    ];
    const datasetUrl = new URL(datasetRequest.toString());
    expect(datasetUrl.pathname).toBe("/v2/datasets/dataset-id/items");
    expect(datasetUrl.searchParams.get("limit")).toBe("20");
    expect(datasetUrl.searchParams.has("token")).toBe(false);
    expect(datasetInit.headers).toEqual({
      Authorization: "Bearer test-token",
    });
  });

  it("rejects malformed Actor slugs before making a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await runApifySkill.handler(
      {
        actor_id: "https://apify.com/xquik/x-tweet-scraper",
        input: {},
      },
      {
        notionToken: undefined,
        customerId: "customer-id",
        apiKeys: { APIFY_TOKEN: "test-token" },
      },
    );

    expect(result).toBe(
      "Error: actor_id must be an Actor ID or a username/actor-name slug.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects invalid charge limits before making a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await runApifySkill.handler(
      {
        actor_id: "xquik/x-follower-scraper",
        input: {},
        max_total_charge_usd: 0,
      },
      {
        notionToken: undefined,
        customerId: "customer-id",
        apiKeys: { APIFY_TOKEN: "test-token" },
      },
    );

    expect(result).toBe(
      "Error: max_total_charge_usd must be a positive number.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
