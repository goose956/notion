/**
 * seed-demo.ts — provision and seed the Teacher Planning OS workspace
 * for the demo@stridivo.com account.
 *
 * Safe to run multiple times:
 *   - Skips workspace creation if one already exists with status "success"
 *   - Skips row insertion if rows already exist in a database
 *
 * Run with: pnpm --filter @niche-factory/db seed-demo
 */

import { randomUUID } from "node:crypto";
import {
  getNichePack,
  listAppWorkspacesByUser,
  listAppDatabasesByWorkspace,
  listAppRowsByDatabase,
  createAppRow,
} from "./queries.js";
import { db } from "./client.js";
import { appWorkspaces, appDatabases } from "./schema.js";
import { sql } from "drizzle-orm";
import type { NichePack } from "@niche-factory/schema";

const DEMO_USER = "demo@stridivo.com";
const NICHE_ID = "teacher";

const SEED_ROWS: Record<string, Array<Record<string, string | number | boolean | null>>> = {
  "tasks": [
    { Title: "Mark Year 9 Shakespeare essays", Subject: "English", Priority: "High", Done: false, "Due Date": "2026-06-20" },
    { Title: "Prepare INSET Day presentation on assessment", Subject: "Admin", Priority: "Medium", Done: false, "Due Date": "2026-06-27" },
    { Title: "Update Year 7 scheme of work", Subject: "English", Priority: "Low", Done: true },
    { Title: "Send parents evening letters home", Subject: "Admin", Priority: "High", Done: false, "Due Date": "2026-06-18" },
    { Title: "Complete Year 10 mock paper marking", Subject: "English", Priority: "High", Done: false, "Due Date": "2026-06-16" },
    { Title: "Book cover for Period 3 on Thursday", Subject: "Admin", Priority: "Medium", Done: false },
    { Title: "Update reading records for Year 8", Subject: "English", Priority: "Low", Done: false },
  ],
  "key-dates": [
    { Title: "Year 10 English Mock Exam", Date: "2026-06-18", Type: "Exam", "Year Group": "Year 10" },
    { Title: "Parents Evening", Date: "2026-06-25", Type: "Parents Evening", "Year Group": "All" },
    { Title: "Summer INSET Day", Date: "2026-07-03", Type: "INSET Day", "Year Group": "All" },
    { Title: "Year 11 Study Skills Trip", Date: "2026-06-30", Type: "Trip", "Year Group": "Year 11" },
    { Title: "Report Writing Deadline", Date: "2026-06-21", Type: "Deadline", "Year Group": "All" },
    { Title: "Year 9 Assessment Week", Date: "2026-07-07", Type: "Exam", "Year Group": "Year 9" },
    { Title: "End of Term", Date: "2026-07-18", Type: "Holiday", "Year Group": "All" },
  ],
  "documents": [
    { Title: "7A English — Macbeth Act 1 Introduction", Type: "Lesson Plan", Subject: "English", "Year Group": "Year 7", Content: "Learning objective: Students will analyse key themes in Act 1 of Macbeth including ambition and power.\n\nStarter (10 min): Think-pair-share on what students know about Shakespeare.\n\nMain activity (30 min): Close reading of Act 1 Scene 7. Students annotate the if it were done soliloquy, focusing on Macbeth's internal conflict.\n\nPlenary (10 min): Exit ticket - write one sentence explaining Macbeth's dilemma." },
    { Title: "Report Comment - Jamie L. (Year 9)", Type: "Report Comment", Subject: "English", "Year Group": "Year 9", Content: "Jamie has made excellent progress this term, demonstrating strong analytical skills in written assignments. He engages confidently in class discussions and supports his peers. Next steps: develop extended writing stamina and vary sentence structures for greater impact." },
    { Title: "Year 8 Poetry Assessment - Comparing Poems", Type: "Assessment", Subject: "English", "Year Group": "Year 8", Content: "Compare how the poets present the theme of conflict in Remains and War Photographer.\n\nAO1 - Identify and interpret information (8 marks)\nAO2 - Analyse language and structure (12 marks)\nAO3 - Compare writers perspectives (8 marks)" },
    { Title: "Year 7 Reading Comprehension - Animal Farm", Type: "Lesson Plan", Subject: "English", "Year Group": "Year 7", Content: "Learning objective: Students will retrieve and infer information from a literary text.\n\nStarter (5 min): Recap - what happened in Chapter 3?\nMain (35 min): Guided reading of Chapter 4 with annotation tasks. Students answer retrieval and inference questions.\nPlenary (10 min): Pair share answers and self-mark." },
    { Title: "Report Comment - Chloe W. (Year 8)", Type: "Report Comment", Subject: "English", "Year Group": "Year 8", Content: "Chloe is a pleasure to teach and consistently produces well-structured written work. Her ability to analyse language features has grown significantly. Next steps: push for more ambitious vocabulary choices in creative writing tasks." },
  ],
  "year-planner": [
    { Term: "Autumn 1", "Year Group": "Year 7", Unit: "Introduction to Fiction", Focus: "Reading and inference skills", "Key Text": "Animal Farm", Assessment: "Comprehension task" },
    { Term: "Autumn 2", "Year Group": "Year 7", Unit: "Gothic Fiction", Focus: "Creative writing", "Key Text": "Various extracts", Assessment: "Extended writing" },
    { Term: "Autumn 1", "Year Group": "Year 9", Unit: "Shakespeare", Focus: "Macbeth - themes and language", "Key Text": "Macbeth", Assessment: "Essay: ambition in Macbeth" },
    { Term: "Autumn 2", "Year Group": "Year 9", Unit: "Modern Drama", Focus: "An Inspector Calls", "Key Text": "An Inspector Calls", Assessment: "Character analysis essay" },
    { Term: "Autumn 1", "Year Group": "Year 10", Unit: "GCSE Poetry", Focus: "Power and conflict cluster", "Key Text": "AQA Anthology", Assessment: "Poem comparison" },
  ],
};

async function provisionWorkspace(pack: NichePack): Promise<string> {
  const workspaceId = randomUUID();
  const now = new Date();

  await db.insert(appWorkspaces).values({
    id: workspaceId,
    userId: DEMO_USER,
    nichePackId: pack.id,
    name: pack.name,
    databaseIdMap: {},
    status: "success",
    durationMs: 0,
    createdAt: now,
  });

  const databaseIdMap: Record<string, string> = {};

  for (const dbDef of pack.databases) {
    const appDbId = randomUUID();
    await db.insert(appDatabases).values({
      id: appDbId,
      workspaceId,
      packDbId: dbDef.id,
      name: dbDef.name,
      schemaVersion: 1,
      propertiesSchema: dbDef.properties as unknown as Record<string, unknown>[],
      createdAt: now,
    });
    databaseIdMap[dbDef.id] = appDbId;
  }

  // Update databaseIdMap on the workspace
  await db
    .update(appWorkspaces)
    .set({ databaseIdMap })
    .where(sql`id = ${workspaceId}`);

  return workspaceId;
}

async function seedDemo() {
  console.log(`Seeding demo account (${DEMO_USER}) with Teacher Planning OS...`);

  // Check if teacher pack exists
  const packRow = await getNichePack(NICHE_ID);
  if (!packRow) {
    console.error("Teacher pack not found in DB. Run the main seed first.");
    process.exit(1);
  }
  const pack = packRow.schemaSnapshot as unknown as NichePack;

  // Check if workspace already exists
  const existing = await listAppWorkspacesByUser(DEMO_USER);
  let teacherWorkspace = existing.find((w) => w.nichePackId === NICHE_ID);

  if (teacherWorkspace) {
    console.log(`  Workspace already exists (${teacherWorkspace.id}) — checking for seed data...`);
  } else {
    console.log("  No workspace found — provisioning...");
    const workspaceId = await provisionWorkspace(pack);
    const refreshed = await listAppWorkspacesByUser(DEMO_USER);
    teacherWorkspace = refreshed.find((w) => w.nichePackId === NICHE_ID);
    if (!teacherWorkspace) throw new Error("Workspace creation failed");
    console.log(`  Workspace created: ${workspaceId}`);
  }

  // Seed rows into each database
  const appDbs = await listAppDatabasesByWorkspace(teacherWorkspace.id);
  let totalInserted = 0;

  for (const appDb of appDbs) {
    const rows = SEED_ROWS[appDb.packDbId];
    if (!rows) {
      console.log(`  Skipping ${appDb.name} (no seed data)`);
      continue;
    }

    // Check if already seeded
    const existing = await listAppRowsByDatabase(appDb.id, { limit: 1 });
    if (existing.length > 0) {
      console.log(`  ${appDb.name} — already has data, skipping`);
      continue;
    }

    for (const row of rows) {
      await createAppRow({
        id: randomUUID(),
        databaseId: appDb.id,
        properties: row,
      });
      totalInserted++;
    }
    console.log(`  ${appDb.name} — inserted ${rows.length} rows`);
  }

  console.log(`Done. Total rows inserted: ${totalInserted}`);
  process.exit(0);
}

seedDemo().catch((err) => {
  console.error(err);
  process.exit(1);
});
