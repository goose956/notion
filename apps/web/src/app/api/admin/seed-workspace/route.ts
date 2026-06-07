import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import {
  listAppWorkspacesByUser,
  listAppDatabasesByWorkspace,
  createAppRow,
} from "@niche-factory/db";

const DEMO_USER_EMAIL = "demo@stridivo.com";

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
      { Title: "7A English — Macbeth Act 1 Introduction", Type: "Lesson Plan", Subject: "English", "Year Group": "Year 7", Content: "Learning objective: Analyse key themes in Act 1 of Macbeth.\n\nStarter (10 min): Think-pair-share on Shakespeare.\nMain activity (30 min): Close reading of Act 1 Scene 7 soliloquy.\nPlenary (10 min): Exit ticket — Macbeth's internal conflict." },
      { Title: "Report Comment — Jamie L. (Year 9)", Type: "Report Comment", Subject: "English", "Year Group": "Year 9", Content: "Jamie has made excellent progress this term, demonstrating strong analytical skills. He engages confidently in class discussions. Next steps: develop extended writing stamina." },
      { Title: "Year 8 Poetry Assessment — Comparing Poems", Type: "Assessment", Subject: "English", "Year Group": "Year 8", Content: "Compare how the poets present conflict in 'Remains' and 'War Photographer'. AO1 (8 marks), AO2 (12 marks), AO3 (8 marks)." },
    ],
  },
  "wedding-planner": {
    "vendors": [
      { "Vendor Name": "Rosewood Blooms", Category: "Florist", Status: "Booked", "Quoted Price": 850, Notes: "Ivory and dusty rose. Deposit paid." },
      { "Vendor Name": "The Grand Hall", Category: "Venue", Status: "Booked", "Quoted Price": 4500, Notes: "150 guests. Tables and chairs included." },
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
    "tasks": [
      { Task: "Book final venue walkthrough", Status: "To Do", Priority: "High", Category: "Venue", "Due Date": "2026-06-20" },
      { Task: "Confirm florist order", Status: "Done", Priority: "High", Category: "Flowers" },
      { Task: "Send invitations", Status: "In Progress", Priority: "High", Category: "Guests", "Due Date": "2026-06-15" },
      { Task: "Book honeymoon hotel", Status: "To Do", Priority: "Medium", Category: "Honeymoon" },
    ],
    "budget": [
      { Item: "Venue hire", Category: "Venue", "Budgeted Amount": 4500, "Actual Amount": 4500, Status: "Paid" },
      { Item: "Florist", Category: "Flowers", "Budgeted Amount": 900, "Actual Amount": 850, Status: "Deposit paid" },
      { Item: "Photography", Category: "Photography", "Budgeted Amount": 2000, "Actual Amount": 1800, Status: "Enquired" },
      { Item: "Catering (per head)", Category: "Catering", "Budgeted Amount": 4000, "Actual Amount": null, Status: "Not booked" },
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
      { Name: "Q3 Product Roadmap", Status: "In Progress", Priority: "High", Goal: "Define product direction for Q3" },
      { Name: "Design System Refresh", Status: "To Do", Priority: "Medium", Goal: "Standardise UI components" },
      { Name: "Marketing Campaign — Summer", Status: "To Do", Priority: "High", Goal: "Drive 20% uplift in sign-ups" },
    ],
  },
  "etsy-shop": {
    "listings": [
      { Title: "Personalised Birth Flower Print", Status: "Active", Price: 12.99, Category: "Prints", Tags: "birth flower, personalised, wall art" },
      { Title: "Custom Name Necklace SVG", Status: "Active", Price: 3.50, Category: "Digital Downloads" },
      { Title: "Wedding Seating Chart Template", Status: "Draft", Price: 8.00, Category: "Stationery" },
      { Title: "Minimalist Moon Phase Poster", Status: "Active", Price: 9.99, Category: "Prints" },
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
      { Title: "How I grew to 10K subscribers", Platform: "YouTube", Status: "Published", "Publish Date": "2026-05-15" },
      { Title: "The creator stack for 2026", Platform: "Instagram", Status: "Published", "Publish Date": "2026-05-28" },
      { Title: "Stop overthinking and start posting", Platform: "TikTok", Status: "Scheduled", "Publish Date": "2026-06-10" },
    ],
  },
  "neurodivergent": {
    "tasks": [
      { Task: "Reply to three emails", "Energy Required": "Low", Context: "Home", Status: "To Do", Priority: "Medium" },
      { Task: "Draft project proposal", "Energy Required": "High", Context: "Deep Work", Status: "In Progress", Priority: "High" },
      { Task: "Book dentist appointment", "Energy Required": "Low", Context: "Phone", Status: "To Do", Priority: "Low" },
      { Task: "Tidy desk space", "Energy Required": "Medium", Context: "Home", Status: "To Do", Priority: "Low" },
    ],
    "brain-dump": [
      { Note: "Need to chase invoice from last month", Category: "Finance", Processed: false },
      { Note: "Idea: start a daily 5-min journal to reduce morning anxiety", Category: "Wellbeing", Processed: false },
      { Note: "Ask manager about flexible working arrangement", Category: "Work", Processed: false },
    ],
  },
  "str-guidebook": {
    "guidebook": [
      { Title: "Welcome to Willow Cottage", Property: "Willow Cottage", Section: "Welcome", Content: "We're so pleased to have you stay! Make yourself comfortable — fresh coffee and local biscuits are in the kitchen." },
      { Title: "Check-in & Check-out", Property: "Willow Cottage", Section: "House Rules", Content: "Check-in: 3pm. Check-out: by 10am. Early/late can sometimes be arranged — message us in advance." },
      { Title: "WiFi & Utilities", Property: "Willow Cottage", Section: "Essentials", Content: "WiFi: WillowCottage2026. Password on the chalkboard by the front door." },
    ],
    "guests": [
      { "Guest Name": "Sophie & Mark Daley", "Check-in Date": "2026-06-14", "Check-out Date": "2026-06-18", "Party Size": 2, Status: "Confirmed" },
      { "Guest Name": "The Johnson Family", "Check-in Date": "2026-06-21", "Check-out Date": "2026-06-28", "Party Size": 4, Status: "Confirmed" },
    ],
  },
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.email !== DEMO_USER_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session.user.id;
  if (!userId) {
    return NextResponse.json({ error: "No user id" }, { status: 400 });
  }

  const body = await req.json() as { nicheId?: string };
  const nicheId = body.nicheId;
  if (!nicheId) {
    return NextResponse.json({ error: "nicheId required" }, { status: 400 });
  }

  const richSeed = RICH_SEED[nicheId];
  if (!richSeed) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  const workspaces = await listAppWorkspacesByUser(userId);
  const workspace = workspaces.find(
    (w) => w.nichePackId === nicheId && w.status === "success",
  );
  if (!workspace) {
    return NextResponse.json({ error: `No active workspace for niche: ${nicheId}` }, { status: 404 });
  }

  const appDbs = await listAppDatabasesByWorkspace(workspace.id);
  let inserted = 0;

  for (const appDb of appDbs) {
    const rowsForDb = richSeed[appDb.packDbId];
    if (!rowsForDb) continue;
    for (const row of rowsForDb) {
      await createAppRow({
        id: randomUUID(),
        databaseId: appDb.id,
        properties: row,
      }).catch(() => null);
      inserted++;
    }
  }

  return NextResponse.json({ ok: true, inserted });
}
