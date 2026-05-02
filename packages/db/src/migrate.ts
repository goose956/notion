/**
 * migrate.ts — run pending Drizzle migrations then exit.
 * Called by Railway's startCommand before the Next.js server launches.
 */
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const url = process.env["DATABASE_URL"];
if (!url) {
  console.error("DATABASE_URL is not set — skipping migrations.");
  process.exit(0);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = join(__dirname, "../drizzle");

const client = postgres(url, { max: 1 });
const db = drizzle(client);

console.log("Running database migrations...");
await migrate(db, { migrationsFolder });
console.log("Migrations complete.");
await client.end();
