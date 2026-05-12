/**
 * seed.ts — seed the database with built-in niche packs.
 *
 * Run with:  pnpm --filter @niche-factory/db seed
 *
 * Safe to run multiple times — uses upsert.
 */
import { upsertNichePack, upsertAgentDefinition } from "./queries.js";
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

  console.log("Seeding default agent definitions...");
  const now = new Date();
  await upsertAgentDefinition({
    id: "default-enrichment-agent",
    name: "Enrichment Agent",
    description: "Reads a Notion page, generates AI enrichment, and writes back the result.",
    systemPrompt:
      "You are an AI data enrichment assistant. Your job is to read records from Notion, " +
      "generate high-quality, factual content using the provided context, and write the result " +
      "back to the appropriate Notion property. Be concise and accurate.",
    model: "claude-sonnet-4-5",
    skillList: ["notion_query", "notion_write", "enrich_record"],
    defaultConfig: { maxTurns: 10, timeoutMs: 60000 },
    createdAt: now,
    updatedAt: now,
  });
  console.log("  ✓ default-enrichment-agent");

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
