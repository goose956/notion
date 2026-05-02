import { Client, APIErrorCode, APIResponseError } from "@notionhq/client";

/**
 * Notion rate limit: ~3 requests/second per integration token.
 * We stay safely under with a 350ms minimum gap between requests.
 */
const RATE_LIMIT_GAP_MS = 350;
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 500;

export interface NotionClientConfig {
  auth: string;
  /** Override to inject a pre-configured Notion Client in tests */
  notionClient?: Client;
}

/**
 * NotionApiClient wraps @notionhq/client with:
 * - Automatic rate-limit detection and retry with exponential backoff
 * - Request serialization to avoid burst 429s
 * - Structured error types
 *
 * This is the ONLY place in the codebase that directly calls @notionhq/client.
 */
export class NotionApiClient {
  private readonly client: Client;
  private lastRequestTime = 0;

  constructor(config: NotionClientConfig) {
    this.client = config.notionClient ?? new Client({ auth: config.auth });
  }

  /**
   * Execute a Notion API call with rate-limit enforcement and retry logic.
   * All methods in this class go through this.
   */
  async call<T>(fn: (client: Client) => Promise<T>): Promise<T> {
    await this.throttle();

    let attempt = 0;
    while (true) {
      try {
        this.lastRequestTime = Date.now();
        return await fn(this.client);
      } catch (err) {
        if (!isAPIResponseError(err)) throw err;

        const isRateLimit =
          err.code === APIErrorCode.RateLimited ||
          err.status === 429;
        const isServiceError = err.status >= 500;

        if ((isRateLimit || isServiceError) && attempt < MAX_RETRIES) {
          const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          await sleep(backoff);
          attempt++;
          continue;
        }
        throw err;
      }
    }
  }

  /**
   * Enforce the minimum gap between requests to stay under rate limits.
   */
  private async throttle(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < RATE_LIMIT_GAP_MS) {
      await sleep(RATE_LIMIT_GAP_MS - elapsed);
    }
  }

  /** Expose the underlying client for complex queries, but only via call() */
  getRawClient(): Client {
    return this.client;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAPIResponseError(err: unknown): err is APIResponseError {
  return err instanceof APIResponseError;
}
