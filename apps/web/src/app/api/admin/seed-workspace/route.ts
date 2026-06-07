import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  listAppWorkspacesByUser,
  listAppDatabasesByWorkspace,
  createAppRow,
} from "@niche-factory/db";
import { auth } from "@/auth";

const DEMO_USER = "demo@stridivo.com";

type SeedRows = Record<string, Array<Record<string, string | number | boolean | null>>>;

const RICH_SEED: Record<string, SeedRows> = {
  teacher: {
    tasks: [
      { Title: "Mark Year 9 Shakespeare essays", Subject: "English", Priority: "High", Done: false },
      { Title: "Prepare INSET Day presentation", Subject: "Admin", Priority: "Medium", Done: false },
      { Title: "Update Year 7 scheme of work", Subject: "English", Priority: "Low", Done: true },
      { Title: "Send parents evening letters home", Subject: "Admin", Priority: "High", Done: false },
      { Title: "Complete Year 10 mock marking", Subject: "English", Priority: "High", Done: false },
    ],
    "key-dates": [
      { Title: "Year 10 English Mock Exam", Date: "2026-06-18", Type: "Exam", "Year Group": "Year 10" },
      { Title: "Parents Evening", Date: "2026-06-25", Type: "Parents Evening", "Year Group": "All" },
      { Title: "Summer INSET Day", Date: "2026-07-03", Type: "INSET Day", "Year Group": "All" },
    ],
    documents: [
      { Title: "7A English - Macbeth Act 1", Type: "Lesson Plan", Subject: "English", "Year Group": "Year 7" },
      { Title: "Report Comment - Jamie L.", Type: "Report Comment", Subject: "English", "Year Group": "Year 9" },
    ],
  },
  "wedding-planner": {
    vendors: [
      { "Vendor Name": "Rosewood Blooms", Category: "Florist", Status: "Booked", "Quoted Price": 850 },
      { "Vendor Name": "The Grand Hall", Category: "Venue", Status: "Booked", "Quoted Price": 4500 },
      { "Vendor Name": "Moments Photography", Category: "Photography", Status: "Contacted", "Quoted Price": 1800 },
    ],
    guests: [
      { "Full Name": "Sarah and Tom Williams", RSVP: "Attending", Side: "Bride", Table: "1" },
      { "Full Name": "James and Lucy Harper", RSVP: "Attending", Side: "Groom", Table: "2" },
      { "Full Name": "Aunt Patricia Moore", RSVP: "Attending", Side: "Bride", "Dietary Requirements": "Vegetarian" },
    ],
  },
  "project-manager": {
    tasks: [
      { Task: "Finalise Q3 product roadmap", Status: "In Progress", Priority: "High", Project: "Product" },
      { Task: "Design system audit", Status: "To Do", Priority: "Medium", Project: "Design" },
      { Task: "Stakeholder review meeting prep", Status: "In Progress", Priority: "High", Project: "Management" },
    ],
    projects: [
      { Name: "Q3 Product Roadmap", Status: "In Progress", Priority: "High", Goal: "Define product direction for Q3" },
      { Name: "Design System Refresh", Status: "To Do", Priority: "Medium", Goal: "Standardise UI components" },
    ],
  },
  "etsy-shop": {
    listings: [
      { Title: "Personalised Birth Flower Print", Status: "Active", Price: 12.99, Category: "Prints" },
      { Title: "Custom Name Necklace SVG", Status: "Active", Price: 3.50, Category: "Digital Downloads" },
      { Title: "Minimalist Moon Phase Poster", Status: "Active", Price: 9.99, Category: "Prints" },
    ],
  },
  "side-hustle": {
    ideas: [
      { Idea: "Notion template bundles", Status: "Testing", "Revenue Potential": "Medium", Effort: "Low" },
      { Idea: "Freelance copywriting", Status: "Active", "Revenue Potential": "High", Effort: "Medium" },
      { Idea: "Print-on-demand stickers", Status: "Researching", "Revenue Potential": "Low", Effort: "Low" },
    ],
  },
  "content-creator": {
    ideas: [
      { Idea: "5 tools I use every day", Platform: "YouTube", Format: "Talking Head", Priority: "High", Status: "Draft" },
      { Idea: "My morning routine for deep work", Platform: "Instagram", Format: "Reel", Priority: "Medium", Status: "Idea" },
    ],
    content: [
      { Title: "How I grew to 10K subscribers", Platform: "YouTube", Status: "Published", Views: 4200 },
      { Title: "The creator stack for 2026", Platform: "Instagram", Status: "Published", Views: 1850 },
    ],
  },
  neurodivergent: {
    tasks: [
      { Task: "Reply to three emails", "Energy Required": "Low", Context: "Home", Status: "To Do", Priority: "Medium" },
      { Task: "Draft project proposal", "Energy Required": "High", Context: "Deep Work", Status: "In Progress", Priority: "High" },
      { Task: "Book dentist appointment", "Energy Required": "Low", Context: "Phone", Status: "To Do", Priority: "Low" },
    ],
    "brain-dump": [
      { Note: "Need to chase invoice from last month", Category: "Finance", Processed: false },
      { Note: "Start a daily 5-min journal", Category: "Wellbeing", Processed: false },
    ],
  },
  "str-guidebook": {
    guidebook: [
      { Title: "Welcome to Willow Cottage", Property: "Willow Cottage", Section: "Welcome" },
      { Title: "Check-in and Check-out", Property: "Willow Cottage", Section: "House Rules" },
    ],
    guests: [
      { "Guest Name": "Sophie and Mark Daley", Property: "Willow Cottage", "Check-in Date": "2026-06-14", Status: "Confirmed" },
      { "Guest Name": "The Johnson Family", Property: "Willow Cottage", "Check-in Date": "2026-06-21", Status: "Confirmed" },
    ],
  },
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.email !== DEMO_USER) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let nicheId: string;
  try {
    const body = await req.json() as { nicheId: string };
    nicheId = body.nicheId;
  } catch {
    return NextResponse.json({ error: "nicheId required" }, { status: 400 });
  }

  if (!nicheId) {
    return NextResponse.json({ error: "nicheId required" }, { status: 400 });
  }

  const workspaces = await listAppWorkspacesByUser(DEMO_USER);
  const workspace = workspaces.find(
    (w) => w.nichePackId === nicheId && w.status === "success"
  );

  if (!workspace) {
    return NextResponse.json(
      { error: "No active workspace found for this niche. Add it first." },
      { status: 404 }
    );
  }

  const richSeed = RICH_SEED[nicheId];
  if (!richSeed) {
    return NextResponse.json({ ok: true, inserted: 0, note: "No seed data configured for this niche" });
  }

  const appDbs = await listAppDatabasesByWorkspace(workspace.id);
  let inserted = 0;

  for (const appDb of appDbs) {
    const rowsForDb = richSeed[appDb.packDbId];
    if (!rowsForDb) continue;
    for (const row of rowsForDb) {
      try {
        await createAppRow({ id: randomUUID(), databaseId: appDb.id, properties: row });
        inserted++;
      } catch {
        // skip row errors
      }
    }
  }

  return NextResponse.json({ ok: true, inserted });
}
