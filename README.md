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
  db/              # Drizzle ORM schema (niche_packs, deploys, adapter_runs)
niches/
  real-estate-investor/  # First shipped niche pack
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

## Adding a new niche pack

1. Create `niches/[niche-id]/` with `schema.json`, `config.yaml`, `onboarding.json`
2. Add adapter stubs in `niches/[niche-id]/sources/` — implement `DataAdapter<RawType, Row>`
3. Add enrichment prompts in `niches/[niche-id]/prompts/`
4. Or: use the AI Draft flow at `/niches/new` to generate all of the above automatically

## Architecture decisions

- `schema.json` is the contract. Validated by Zod at every boundary.
- Direct `@notionhq/client` calls only in `packages/notion-client`.
- AI prompts live in versioned `.txt` files — never inline JS strings.
- The sync engine (running adapters on a schedule) is v0.2 — adapters are scaffolded but not executed in v0.1.

## Deployment

The app is configured for Railway (`railway.json`). Push to `main` → auto-deploy.

Set these environment variables in the Railway dashboard:
- `DATABASE_URL` (auto-injected if you add a Postgres service)
- `ANTHROPIC_API_KEY`
- `NOTION_TOKEN`
