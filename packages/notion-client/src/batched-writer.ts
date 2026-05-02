import type { Client } from "@notionhq/client";
import type { NotionApiClient } from "./client.js";

const BATCH_SIZE = 10;

export interface BatchedWriteOperation {
  execute: (client: Client) => Promise<unknown>;
}

/**
 * BatchedWriter buffers Notion write operations and flushes them serially
 * through the rate-limited NotionApiClient.
 *
 * The Notion API doesn't support true bulk writes; this ensures we don't
 * fire all requests simultaneously and blow the rate limit.
 */
export class BatchedWriter {
  private readonly queue: BatchedWriteOperation[] = [];

  constructor(private readonly apiClient: NotionApiClient) {}

  enqueue(op: BatchedWriteOperation): void {
    this.queue.push(op);
  }

  async flush(): Promise<void> {
    const ops = this.queue.splice(0, this.queue.length);
    for (let i = 0; i < ops.length; i += BATCH_SIZE) {
      const batch = ops.slice(i, i + BATCH_SIZE);
      // Process each batch serially — the client's throttle() handles spacing
      for (const op of batch) {
        await this.apiClient.call((client) => op.execute(client));
      }
    }
  }
}
