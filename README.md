# Niche Factory

A vertical-product factory that generates full Notion niche packs — workspace schema, data adapters, and AI enrichment prompts — and deploys them to a connected Notion workspace.

## What it is

Each **niche pack** is:
1. A **Notion workspace schema** (databases, properties, formulas, relations)
2. **Data adapter stubs** that fetch live data from external APIs (Zillow, PropStream, Reddit, etc.)
3. **AI enrichment prompts** that score and summarize incoming data using domain logic
4. **Onboarding questions** to capture customer-specific criteria

The `DataAdapter<RawType, Row>` interface in `packages/adapter-runtime` is the architectural keystone — every data source, regardless of niche, conforms to it.

## Monorepo structure

```
apps/web/          # Next.js 14 — UI + API routes
packages/
  schema/          # Zod schemas — the niche pack contract
  adapter-runtime/ # DataAdapter interface + base classes (RSS, REST, Reddit)
  notion-client/   # Rate-limited @notionhq/client wrapper
  deployer/        # Niche pack → Notion workspace
  exporter/        # Notion workspace → niche pack JSON
  ai/              # Claude generation + adapter scaffolding
  agent-tools/     # Skill registry (web_search, notion_query/create/archive/write, …)
  db/              # Drizzle ORM schema (niche_packs, deploys, adapter_runs, app_settings)
niches/
  real-estate-investor/        # First shipped niche pack
  local-business-lead-tracker/ # Apify-backed local business lead adapter
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- A Postgres database (Railway recommended)
- Anthropic API key
- Notion integration token

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env and fill in DATABASE_URL, ANTHROPIC_API_KEY, NOTION_TOKEN

# 3. Run database migrations
pnpm db:migrate

# 4. Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/niches`.

## Key commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript check across all packages |
| `pnpm db:generate` | Generate Drizzle migration files |
| `pnpm db:migrate` | Apply migrations to the database |
| `pnpm db:studio` | Open Drizzle Studio (DB GUI) |
| `pnpm exec tsx scripts/debug-apify-smoke.ts` | Smoke-test the `apify-google-places` adapter |

## Recent updates (May 2026)

### 13 May 2026 — Bidirectional Notion writes + split-panel research UI

- Added `notion_create` and `notion_archive` agent skills so the members chatbot can add and remove Notion database rows.
- Members chat model switched to `claude-haiku-4-5` (configurable via Admin → Settings → Anthropic Model).
- Chat system prompt now dynamically injects deployed database IDs and exact property names so Claude outputs structured JSON matching Notion's schema.
- Added `/api/members/databases` endpoint (returns all deployed Notion DB IDs for the authenticated member).
- Added `/api/members/notion-add` endpoint (direct Notion page creation from the UI, no AI round-trip).
- Deploy route now persists `databaseIdMap` to the `deploys` table so downstream features can resolve pack database IDs.
- Members chat page rewritten as a split-panel research interface:
  - **Left panel** — input, live tool activity feed, suggested prompts
  - **Right panel** — structured result cards with per-item and bulk "Add to Notion" buttons, database selector

### 12 May 2026

- Added runtime integration settings at `/admin/settings` backed by a persistent `app_settings` table and `/api/settings`.
- Updated checkout, Stripe webhook, and enrichment APIs to read configured secrets/model from DB settings first, then fall back to environment variables.
- Improved sync engine row writes by mapping values to real Notion property types (title, rich_text, number, checkbox, date, url, phone, email, status, select, multi_select) using target database metadata.
- Added sync run observability with structured logs in `/api/sync` and the Apify adapter.
- Hardened the local-business lead adapter (`apify-google-places`) by switching to run polling and adding detailed filter summary logging.
- Added `scripts/debug-apify-smoke.ts` for quick local verification of Apify credentials and first-item fetch behavior.

## Adding a new niche pack

1. Create `niches/[niche-id]/` with `schema.json`, `config.yaml`, `onboarding.json`
2. Add adapter stubs in `niches/[niche-id]/sources/` — implement `DataAdapter<RawType, Row>`
3. Add enrichment prompts in `niches/[niche-id]/prompts/`
4. Or: use the AI Draft flow at `/niches/new` to generate all of the above automatically

## Adding a new members workspace niche (UI)

The workspace UI is fully registry-driven — `WorkspacePage` has zero niche-specific code. Adding a new niche is three steps:

**1. Register it** — add an entry to `apps/web/src/lib/niche-registry.ts`:
```ts
{
  nicheId: "my-niche",
  virtualTabIds: new Set([MY_TABS.DASHBOARD, MY_TABS.TOOL]),
  defaultTabId: MY_TABS.DASHBOARD,
  hiddenDbIds: [],
  accent: { hex: "#...", fgActive: "...", /* ... */ },
  sidebarEmoji: "🏠",
  topTabs: [{ tabId: MY_TABS.DASHBOARD, label: "Dashboard", icon: "📊" }],
  afterDbNamePattern: /main database name/i,
  afterDbTabs: [{ tabId: MY_TABS.TOOL, label: "My Tool", icon: "🔧" }],
  dbPropertyInjections: { /* optional virtual columns */ },
}
```

**2. Create a shell** — `apps/web/src/components/niches/[niche-id]/shell.tsx`:
- Receives `activeTab`, `databases`, and any API data it needs
- Owns all niche-specific state (criteria, live derived values)
- Returns `null` when `activeTab` is not one of its tabs (stays mounted → state persists across tab switches)
- See `apps/web/src/components/niches/wedding-planner/shell.tsx` as the reference

**3. Mount the shell** — add one `if` branch to the `NICHE_REGISTRY.map()` block in `page.tsx`:
```tsx
if (entry.nicheId === "my-niche") return <MyNicheShell key="my-niche" activeTab={activeTab} ... />;
```

The view components inside the shell are entirely niche-specific — no conventions needed there.

## Architecture decisions

- `schema.json` is the contract. Validated by Zod at every boundary.
- Direct `@notionhq/client` calls only in `packages/notion-client`.
- AI prompts live in versioned `.txt` files — never inline JS strings.
- Sync runs are supported via API/manual triggers; scheduled orchestration remains an incremental follow-up.

## Deployment

The app is configured for Railway (`railway.json`). Push to `main` → auto-deploy.

Set these environment variables in the Railway dashboard:
- `DATABASE_URL` (auto-injected if you add a Postgres service)
- `ANTHROPIC_API_KEY`
- `NOTION_TOKEN`
