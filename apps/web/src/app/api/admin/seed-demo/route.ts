import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import fs from "fs";
import path from "path";
import {
  getNichePack,
  upsertNichePack,
  getLatestAppWorkspaceByNiche,
  createAppWorkspace,
  createAppDatabase,
  createAppRow,
  updateAppWorkspaceStatus,
  addCustomerWorkflow,
  upsertUserCriteria,
  listAppDatabasesByWorkspace,
} from "@niche-factory/db";
import { NichePackSchema } from "@niche-factory/schema";
import type { NichePack } from "@niche-factory/schema";

// Resolve the niches directory — works both locally and on Railway
function getNicheSchemaPath(nicheId: string): string {
  const candidates = [
    path.join(process.cwd(), "../../niches", nicheId, "schema.json"),
    path.join(process.cwd(), "niches", nicheId, "schema.json"),
    path.join(__dirname, "../../../../../../niches", nicheId, "schema.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`schema.json not found for niche: ${nicheId}`);
}

async function ensureNichePackInDb(nicheId: string): Promise<void> {
  const schemaPath = getNicheSchemaPath(nicheId);
  const raw = JSON.parse(fs.readFileSync(schemaPath, "utf-8")) as unknown;
  const result = NichePackSchema.safeParse(raw);
  if (!result.success) throw new Error(`Invalid schema for ${nicheId}: ${result.error.message}`);
  await upsertNichePack(result.data);
}

const DEMO_USER = "demo@stridivo.com";

const ALL_NICHES = [
  "wedding-planner",
  "project-manager",
  "neurodivergent",
  "side-hustle",
  "food-business",
  "content-creator",
  "etsy-shop",
  "cake-business",
  "str-guidebook",
  "nail-tech",
  "teacher",
  "author",
  "freelancer",
  "personal-trainer",
  "amazon-fba",
  "podcast",
  "vibe-coder",
  "keto",
  "send-parent",
];

// ─── Rich seed rows per niche ─────────────────────────────────────────────────
type SeedRows = Record<string, Array<Record<string, string | number | boolean | null>>>;

const RICH_SEED: Record<string, SeedRows> = {
  "teacher": {
    "tasks": [
      { Title: "Mark Year 9 Shakespeare essays", Subject: "English", Priority: "High", Done: false, "Due Date": "2026-06-14" },
      { Title: "Prepare INSET Day presentation on assessment", Subject: "Admin", Priority: "Medium", Done: false, "Due Date": "2026-06-20" },
      { Title: "Update Year 7 scheme of work", Subject: "English", Priority: "Low", Done: true },
      { Title: "Send parents evening letters home", Subject: "Admin", Priority: "High", Done: false, "Due Date": "2026-06-10" },
      { Title: "Complete Year 10 mock paper marking", Subject: "English", Priority: "High", Done: false, "Due Date": "2026-06-12" },
    ],
    "key-dates": [
      { Title: "Year 10 English Mock Exam", Date: "2026-06-18", Type: "Exam", "Year Group": "Year 10" },
      { Title: "Parents Evening", Date: "2026-06-25", Type: "Parents Evening", "Year Group": "All" },
      { Title: "Summer INSET Day", Date: "2026-07-03", Type: "INSET Day", "Year Group": "All" },
      { Title: "Year 11 Study Skills Trip", Date: "2026-06-30", Type: "Trip", "Year Group": "Year 11" },
      { Title: "Report Writing Deadline", Date: "2026-06-21", Type: "Deadline", "Year Group": "All" },
    ],
    "documents": [
      { Title: "7A English — Macbeth Act 1 Introduction", Type: "Lesson Plan", Subject: "English", "Year Group": "Year 7", Content: "Learning objective: Students will analyse key themes in Act 1 of Macbeth including ambition and power.\n\nStarter (10 min): Think-pair-share — what do you know about Shakespeare?\n\nMain activity (30 min): Close reading of Act 1 Scene 7. Students annotate the 'if it were done' soliloquy.\n\nPlenary (10 min): Exit ticket — write one sentence explaining Macbeth's internal conflict." },
      { Title: "Report Comment — Jamie L. (Year 9)", Type: "Report Comment", Subject: "English", "Year Group": "Year 9", Content: "Jamie has made excellent progress this term, demonstrating strong analytical skills in written assignments. He engages confidently in class discussions and supports his peers well. Next steps: develop extended writing stamina and vary sentence structures for greater impact." },
      { Title: "Year 8 Poetry Assessment — Comparing Poems", Type: "Assessment", Subject: "English", "Year Group": "Year 8", Content: "Assessment criteria:\n1. AO1 — Identify and interpret explicit and implicit information (8 marks)\n2. AO2 — Explain, comment on and analyse how language and structure is used (12 marks)\n3. AO3 — Compare writers' ideas and perspectives (8 marks)\n\nTask: Compare how the poets present the theme of conflict in 'Remains' and 'War Photographer'." },
    ],
  },
  "wedding-planner": {
    "vendors": [
      { "Vendor Name": "Rosewood Blooms", Category: "Florist", Status: "Booked", "Quoted Price": 850, Notes: "Ivory and dusty rose arrangement. Deposit paid." },
      { "Vendor Name": "The Grand Hall", Category: "Venue", Status: "Booked", "Quoted Price": 4500, Notes: "150 guests capacity. Includes tables and chairs." },
      { "Vendor Name": "Moments Photography", Category: "Photography", Status: "Contacted", "Quoted Price": 1800 },
      { "Vendor Name": "Chef Marco Catering", Category: "Catering", Status: "Not Contacted", "Quoted Price": 3200 },
    ],
    "guests": [
      { "Full Name": "Sarah & Tom Williams", RSVP: "Attending", Side: "Bride", Table: "1" },
      { "Full Name": "James & Lucy Harper", RSVP: "Attending", Side: "Groom", Table: "2" },
      { "Full Name": "Aunt Patricia Moore", RSVP: "Attending", Side: "Bride", "Dietary Requirements": "Vegetarian", Table: "3" },
      { "Full Name": "David Chen", RSVP: "Pending", Side: "Groom" },
      { "Full Name": "Emma & Josh Taylor", RSVP: "Attending", Side: "Bride", Table: "1" },
    ],
  },
  "project-manager": {
    "tasks": [
      { Task: "Finalise Q3 product roadmap", Status: "In Progress", Priority: "High", Project: "Product", "Due Date": "2026-06-15" },
      { Task: "Design system audit", Status: "To Do", Priority: "Medium", Project: "Design" },
      { Task: "Stakeholder review meeting prep", Status: "In Progress", Priority: "High", Project: "Management" },
      { Task: "Update API documentation", Status: "Done", Priority: "Low", Project: "Engineering" },
      { Task: "Launch email campaign", Status: "To Do", Priority: "High", Project: "Marketing", "Due Date": "2026-06-20" },
    ],
    "projects": [
      { Name: "Q3 Product Roadmap", Status: "In Progress", Priority: "High", Goal: "Define and align on product direction for Q3" },
      { Name: "Design System Refresh", Status: "To Do", Priority: "Medium", Goal: "Standardise UI components across all product surfaces" },
      { Name: "Marketing Campaign — Summer", Status: "To Do", Priority: "High", Goal: "Drive 20% uplift in sign-ups through targeted outreach" },
    ],
  },
  "etsy-shop": {
    "listings": [
      { Title: "Personalised Birth Flower Print", Status: "Active", Price: 12.99, Category: "Prints", Tags: "birth flower, personalised, wall art" },
      { Title: "Custom Name Necklace SVG", Status: "Active", Price: 3.50, Category: "Digital Downloads" },
      { Title: "Wedding Seating Chart Template", Status: "Draft", Price: 8.00, Category: "Stationery" },
      { Title: "Minimalist Moon Phase Poster", Status: "Active", Price: 9.99, Category: "Prints", Tags: "moon phase, boho, wall art" },
    ],
  },
  "side-hustle": {
    "ideas": [
      { Idea: "Notion template bundles", Status: "Testing", "Revenue Potential": "Medium", Effort: "Low" },
      { Idea: "Freelance copywriting", Status: "Active", "Revenue Potential": "High", Effort: "Medium" },
      { Idea: "Print-on-demand stickers", Status: "Researching", "Revenue Potential": "Low", Effort: "Low" },
      { Idea: "Digital planner for Etsy", Status: "Researching", "Revenue Potential": "Medium", Effort: "Low" },
    ],
  },
  "content-creator": {
    "ideas": [
      { Idea: "5 tools I use every day as a creator", Platform: "YouTube", Format: "Talking Head", Priority: "High", Status: "Draft" },
      { Idea: "My morning routine for deep work", Platform: "Instagram", Format: "Reel", Priority: "Medium", Status: "Idea" },
      { Idea: "How I batch content in 2 hours", Platform: "TikTok", Format: "Reel", Priority: "High", Status: "Draft" },
    ],
    "content": [
      { Title: "How I grew to 10K subscribers", Platform: "YouTube", Format: "Long-form", Status: "Published", "Publish Date": "2026-05-15", Views: 4200 },
      { Title: "The creator stack for 2026", Platform: "Instagram", Format: "Carousel", Status: "Published", "Publish Date": "2026-05-28", Views: 1850 },
      { Title: "Stop overthinking and start posting", Platform: "TikTok", Format: "Reel", Status: "Scheduled", "Publish Date": "2026-06-10" },
    ],
  },
  "neurodivergent": {
    "tasks": [
      { Task: "Reply to three emails", "Energy Required": "Low", Context: "Home", Status: "To Do", Priority: "Medium", Project: "Admin" },
      { Task: "Draft project proposal", "Energy Required": "High", Context: "Deep Work", Status: "In Progress", Priority: "High", Project: "Work" },
      { Task: "Book dentist appointment", "Energy Required": "Low", Context: "Phone", Status: "To Do", Priority: "Low", Project: "Life Admin" },
      { Task: "Tidy desk space", "Energy Required": "Medium", Context: "Home", Status: "To Do", Priority: "Low", Project: "Environment" },
      { Task: "Read chapter 3 of book", "Energy Required": "Low", Context: "Quiet", Status: "To Do", Priority: "Low", Project: "Learning" },
    ],
    "brain-dump": [
      { Note: "Need to chase invoice from last month — keep forgetting", Category: "Finance", Processed: false },
      { Note: "Idea: start a daily 5-min journal to reduce morning anxiety", Category: "Wellbeing", Processed: false },
      { Note: "Ask manager about flexible working arrangement", Category: "Work", Processed: false },
    ],
  },
  "str-guidebook": {
    "guidebook": [
      { Title: "Welcome to Willow Cottage", Property: "Willow Cottage", Section: "Welcome", Content: "We're so pleased to have you stay! Willow Cottage is your home away from home in the heart of the Cotswolds. Make yourself comfortable — fresh coffee and local biscuits are in the kitchen." },
      { Title: "Check-in & Check-out", Property: "Willow Cottage", Section: "House Rules", Content: "Check-in: 3pm onwards. Check-out: by 10am. Early check-in / late check-out can sometimes be arranged — message us in advance and we'll do our best." },
      { Title: "WiFi & Utilities", Property: "Willow Cottage", Section: "Essentials", Content: "WiFi: WillowCottage2026. Password on the chalkboard by the front door. Heating: the boiler controls are in the utility room. Hot water is on-demand." },
    ],
    "guests": [
      { "Guest Name": "Sophie & Mark Daley", Property: "Willow Cottage", "Check-in Date": "2026-06-14", "Check-out Date": "2026-06-18", "Party Size": 2, Status: "Confirmed" },
      { "Guest Name": "The Johnson Family", Property: "Willow Cottage", "Check-in Date": "2026-06-21", "Check-out Date": "2026-06-28", "Party Size": 4, Status: "Confirmed" },
      { "Guest Name": "Anna Kowalski", Property: "Willow Cottage", "Check-in Date": "2026-07-05", "Check-out Date": "2026-07-07", "Party Size": 2, Status: "Enquiry" },
    ],
  },
};

// Default fallback rows for niches not in RICH_SEED
function getDefaultRows(nicheId: string): SeedRows {
  return {};
}

// ─── Provision a workspace (mirrors provisionAppWorkspace from workspace route) ─
async function seedWorkspace(userId: string, nicheId: string): Promise<void> {
  const packRow = await getNichePack(nicheId);
  if (!packRow) throw new Error(`Pack not found: ${nicheId}`);
  const pack = packRow.schemaSnapshot as unknown as NichePack;

  const workspaceId = randomUUID();
  await createAppWorkspace({
    id: workspaceId,
    userId,
    nichePackId: pack.id,
    name: pack.name,
    databaseIdMap: {},
    status: "in_progress",
    createdAt: new Date(),
  });

  const databaseIdMap: Record<string, string> = {};
  const start = Date.now();

  try {
    for (const db of pack.databases) {
      const appDbId = randomUUID();
      await createAppDatabase({
        id: appDbId,
        workspaceId,
        packDbId: db.id,
        name: db.name,
        schemaVersion: packRow.version,
        propertiesSchema: db.properties as unknown as Record<string, unknown>[],
        createdAt: new Date(),
      });
      databaseIdMap[db.id] = appDbId;

      // Seed schema seedData rows
      const seedData = (db as unknown as { seedData?: Array<Record<string, unknown>> }).seedData;
      if (Array.isArray(seedData)) {
        for (const row of seedData) {
          await createAppRow({
            id: randomUUID(),
            databaseId: appDbId,
            properties: row as Record<string, string | number | boolean | null>,
          }).catch(() => null);
        }
      }
    }

    await updateAppWorkspaceStatus(workspaceId, {
      status: "success",
      durationMs: Date.now() - start,
      databaseIdMap,
    });

    await addCustomerWorkflow(userId, pack.id).catch(() => null);

    // Insert rich demo rows
    const richSeed = RICH_SEED[nicheId] ?? getDefaultRows(nicheId);
    const appDbs = await listAppDatabasesByWorkspace(workspaceId);

    for (const appDb of appDbs) {
      const rowsForDb = richSeed[appDb.packDbId];
      if (!rowsForDb) continue;
      for (const row of rowsForDb) {
        await createAppRow({
          id: randomUUID(),
          databaseId: appDb.id,
          properties: row,
        }).catch(() => null);
      }
    }

    // Upsert basic criteria so the niche dashboard has something to work with
    await upsertUserCriteria(userId, nicheId, { seeded: true, seededAt: new Date().toISOString() }).catch(() => null);

  } catch (err) {
    const message = err instanceof Error ? err.message : "Seed failed";
    await updateAppWorkspaceStatus(workspaceId, {
      status: "failed",
      errorMessage: message,
    }).catch(() => null);
    throw err;
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let reset = false;
  try {
    const body = await req.json() as { reset?: boolean };
    reset = !!body.reset;
  } catch { /* no body */ }

  let provisioned = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const nicheId of ALL_NICHES) {
    try {
      const existing = await getLatestAppWorkspaceByNiche(DEMO_USER, nicheId).catch(() => undefined);
      if (existing) {
        skipped++;
        continue;
      }

      // Load schema into DB first (no-op if already present)
      await ensureNichePackInDb(nicheId);
      await seedWorkspace(DEMO_USER, nicheId);
      provisioned++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${nicheId}: ${msg}`);
    }
  }

  return NextResponse.json({ ok: true, provisioned, skipped, errors });
}
