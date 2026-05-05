/**
 * migrate.ts — run pending Drizzle migrations then exit.
 * Called by Railway's startCommand before the Next.js server launches.
 * Loads .env.local for local development.
 */
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import fs from "node:fs";
import path from "node:path";

// Load .env.local for local development if it exists
const __dirname = dirname(fileURLToPath(import.meta.url));
const envLocalPath = path.join(__dirname, "../../apps/web/.env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").replace(/^['"]|['"]$/g, "");
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

const url = process.env["DATABASE_URL"];
if (!url) {
  console.error("DATABASE_URL is not set — skipping migrations.");
  process.exit(0);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = join(__dirname, "../drizzle");

const __dirnameForMigrations = dirname(fileURLToPath(import.meta.url));
const migrationsFolderPath = join(__dirnameForMigrations, "../drizzle");

const client = postgres(url, { max: 1 });
const db = drizzle(client);

console.log("Running database migrations...");
await migrate(db, { migrationsFolder: migrationsFolderPath });
console.log("Migrations complete.");
await client.end();
