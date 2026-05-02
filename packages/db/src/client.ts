import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

function getDatabaseUrl(): string {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Copy .env.example to .env and fill in your Railway Postgres URL.",
    );
  }
  return url;
}

/**
 * Lazy Postgres connection — only opens when first used.
 * In Next.js API routes, import { db } and use it directly.
 */
let _client: ReturnType<typeof postgres> | undefined;
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (_db === undefined) {
    _client = postgres(getDatabaseUrl(), { max: 10 });
    _db = drizzle(_client, { schema });
  }
  return _db;
}

/** Convenience re-export so callers can write `import { db } from '@niche-factory/db'` */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});
