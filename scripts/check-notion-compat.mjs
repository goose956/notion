#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const nichesDir = path.join(repoRoot, "niches");

const supported = new Set([
  "title",
  "rich_text",
  "number",
  "select",
  "multi_select",
  "status",
  "date",
  "people",
  "files",
  "checkbox",
  "url",
  "email",
  "phone_number",
  "formula",
  "relation",
  "rollup",
  "unique_id",
  "verification",
]);

const skippedReadOnly = new Set([
  "created_time",
  "created_by",
  "last_edited_time",
  "last_edited_by",
]);

const nicheFolders = fs
  .readdirSync(nichesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort((a, b) => a.localeCompare(b));

let hasErrors = false;

for (const nicheId of nicheFolders) {
  const schemaPath = path.join(nichesDir, nicheId, "schema.json");
  if (!fs.existsSync(schemaPath)) continue;

  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const databases = Array.isArray(schema.databases) ? schema.databases : [];
  const deployDatabases = databases.filter((d) => d.notionDeploy !== false);
  const dbIds = new Set(deployDatabases.map((d) => d.id));

  const typeCounts = new Map();
  const unsupported = [];
  const skipped = [];
  const badRelations = [];

  for (const db of deployDatabases) {
    for (const prop of db.properties ?? []) {
      typeCounts.set(prop.type, (typeCounts.get(prop.type) ?? 0) + 1);

      if (!supported.has(prop.type) && !skippedReadOnly.has(prop.type)) {
        unsupported.push({ dbId: db.id, name: prop.name, type: prop.type });
      }

      if (skippedReadOnly.has(prop.type)) {
        skipped.push({ dbId: db.id, name: prop.name, type: prop.type });
      }

      if (prop.type === "relation" && !dbIds.has(prop.targetDatabaseId)) {
        badRelations.push({
          dbId: db.id,
          name: prop.name,
          targetDatabaseId: prop.targetDatabaseId,
        });
      }
    }
  }

  const typeSummary = Array.from(typeCounts.entries())
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([k, v]) => `${k}:${v}`)
    .join(", ");

  console.log(`\n[${nicheId}]`);
  console.log(`  databases: ${deployDatabases.length} deployable / ${databases.length} total`);
  console.log(`  property types: ${typeSummary || "(none)"}`);

  if (unsupported.length > 0) {
    hasErrors = true;
    console.log("  ERROR unsupported property types:");
    for (const item of unsupported) {
      console.log(`    - ${item.dbId}.${item.name} (${item.type})`);
    }
  }

  if (badRelations.length > 0) {
    hasErrors = true;
    console.log("  ERROR broken relation targets:");
    for (const item of badRelations) {
      console.log(`    - ${item.dbId}.${item.name} -> ${item.targetDatabaseId}`);
    }
  }

  if (skipped.length > 0) {
    console.log("  WARN read-only properties (not created by deployer):");
    for (const item of skipped) {
      console.log(`    - ${item.dbId}.${item.name} (${item.type})`);
    }
  }

  if (unsupported.length === 0 && badRelations.length === 0) {
    console.log("  status: compatible");
  }
}

if (hasErrors) {
  console.error("\nNotion compatibility check failed.");
  process.exit(1);
}

console.log("\nNotion compatibility check passed.");
