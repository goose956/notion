import type { DataAdapter, CustomerCriteria } from "../interface.js";

export interface RestAdapterCriteria extends CustomerCriteria {
  baseUrl?: string;
  queryParams?: Record<string, string>;
}

/**
 * RestAdapter — abstract base class for JSON REST API sources.
 *
 * Concrete adapters extend this class and implement `buildRequest()`,
 * `normalize()`, and `cacheKey()`.
 */
export abstract class RestAdapter<RawType = unknown, Row = unknown>
  implements DataAdapter<RawType, Row, RestAdapterCriteria>
{
  abstract readonly id: string;
  abstract readonly niche: string;
  abstract readonly description: string;
  abstract readonly requiredCredentials: readonly string[];

  async *fetch(
    criteria: RestAdapterCriteria,
    credentials: Readonly<Record<string, string>>,
  ): AsyncIterable<RawType> {
    const request = this.buildRequest(criteria, credentials);
    const init: RequestInit = { method: request.method ?? "GET" };
    if (request.headers !== undefined) init.headers = request.headers;
    const response = await fetch(request.url, init);
    if (!response.ok) {
      throw new Error(
        `REST fetch failed: ${request.url} → HTTP ${response.status}`,
      );
    }
    const data: unknown = await response.json();
    yield* this.extractItems(data);
  }

  abstract normalize(raw: RawType): Row;
  abstract cacheKey(row: Row): string;

  /**
   * Build the HTTP request for this adapter.
   * Override to add auth headers, pagination, etc.
   */
  abstract buildRequest(
    criteria: RestAdapterCriteria,
    credentials: Readonly<Record<string, string>>,
  ): { url: string; method?: string; headers?: Record<string, string> };

  /**
   * Extract the array of raw items from the API response body.
   * Override to navigate to the right path (e.g. `response.results`).
   */
  protected *extractItems(data: unknown): Iterable<RawType> {
    if (Array.isArray(data)) {
      for (const item of data) {
        yield item as RawType;
      }
    } else {
      throw new Error(
        `RestAdapter.extractItems: expected array, got ${typeof data}. ` +
          `Override extractItems() to handle this response shape.`,
      );
    }
  }
}
