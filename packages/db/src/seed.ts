/**
 * seed.ts — seed the database with built-in niche packs.
 *
 * Run with:  pnpm --filter @niche-factory/db seed
 *
 * Safe to run multiple times — uses upsert.
 */
import { upsertNichePack } from "./queries.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import type { NichePack } from "@niche-factory/schema";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadSchema(relativePath: string): NichePack {
  const abs = join(__dirname, relativePath);
  return JSON.parse(readFileSync(abs, "utf8")) as NichePack;
}

const packs: NichePack[] = [
  loadSchema("../../../niches/real-estate-investor/schema.json"),
  loadSchema("../../../niches/local-business-lead-tracker/schema.json"),
];

async function seed() {
  console.log("Seeding niche packs...");
  for (const pack of packs) {
    await upsertNichePack(pack);
    console.log(`  ✓ ${pack.id}`);
  }
  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
