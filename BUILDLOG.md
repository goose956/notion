# Niche Factory — Build Log

A chronological record of every design decision, file created, and technical choice made during the initial build of the Niche Factory monorepo.

---

## Phase 1 — Monorepo Scaffold

**Goal**: establish the repo structure, tooling, and package contracts before writing any business logic.

### Root workspace files

| File | Purpose |
|------|---------|
| `pnpm-workspace.yaml` | Declares `apps/*` and `packages/*` workspace members |
| `package.json` | Root scripts (`dev`, `build`, `typecheck`, `db:*`) |
| `tsconfig.base.json` | Shared TypeScript config — strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `module: NodeNext` |
| `.env.example` | Documents required env vars: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `NOTION_TOKEN`, `PROPSTREAM_API_KEY` |
| `railway.json` | Railway deployment config — `startCommand: "pnpm --filter web start"`, healthcheck at `/api/health` |

### TypeScript strictness rationale

`noUncheckedIndexedAccess` forces every array/record access to handle `undefined`, eliminating a whole class of runtime crashes common in data-heavy apps. `exactOptionalPropertyTypes` prevents assigning `undefined` where a property is simply optional. Together these make the schema validation code provably safe at the type level.

---

## Phase 2 — `packages/schema`

The schema package is the **single source of truth** for the niche pack contract. Every package that reads or writes a `NichePack` imports from here.

### Files

#### `src/property.ts`
All 22 Notion property types modelled as a Zod discriminated union on the `type` field:

```
title | rich_text | number | select | multi_select | status | date |
people | files | checkbox | url | email | phone_number | formula |
relation | rollup | created_time | created_by | last_edited_time |
last_edited_by | unique_id | verification
```

Key design: `relation` carries a `targetDatabaseId` (pack-local ID, not a Notion ID) so packs are portable before deployment.

#### `src/database.ts`
`DatabaseSchema` — `id`, `name`, `description`, `icon`, `properties[]`, `views[]`.  
`ViewSchema` — `name`, `type` (table/board/gallery/list/calendar/timeline), `filters`, `sorts`, `groupByProperty`.

#### `src/data-source.ts`
`DataSourceSchema` — `id` (kebab-case), `label`, `description`, `stubFile`, `requiredCredentials`, `targetDatabaseId`, `schedule` (hourly/daily/weekly/manual, default daily).

#### `src/seed-page.ts`
`SeedPageSchema` — pre-populate databases after a deploy. Each seed page references a database by its pack-local ID.

#### `src/niche-pack.ts`
`NichePackSchema` — the top-level contract:
- `version`, `id`, `name`, `description`, `tagline`
- `databases` (min 1)
- `dataSources` (min 1)
- `enrichmentPrompts` — AI scoring/summarisation prompt configs
- `seedPages` — demo data for first-time users
- `onboardingQuestions` — setup wizard questions

---

## Phase 3 — `packages/adapter-runtime`

The `DataAdapter<RawType, Row, Criteria>` interface is the **architectural keystone** of the sync engine. Every data source, regardless of niche, conforms to it.

### `src/interface.ts`

```typescript
interface DataAdapter<RawType, Row, Criteria> {
  readonly id: string;
  readonly niche: string;
  readonly description: string;
  readonly requiredCredentials: readonly string[];
  fetch(criteria, credentials): AsyncIterable<RawType>;
  normalize(raw: RawType): Row;
  cacheKey(row: Row): string;
}
```

`fetch` is an `AsyncIterable` (not a Promise of an array) so large data sets can be streamed without buffering everything in memory. `cacheKey` enables idempotent syncs — rows are deduplicated before Notion writes.

### `src/registry.ts`
In-memory adapter registry keyed by `${niche}:${id}`. Provides `registerAdapter`, `getAdapter`, `getNicheAdapters`, `clearRegistry`.

### `src/base/rss-adapter.ts`
Abstract base class for RSS feeds. Contains a minimal regex-based RSS parser to avoid a large XML dependency in v0.1 (marked TODO: replace with `fast-xml-parser` in v0.2). Parses `<item>` blocks for `title`, `link`, `pubDate`, `description`, `guid`.

### `src/base/rest-adapter.ts`
Abstract base class for REST APIs. Subclasses implement `buildRequest(criteria, credentials)` and `extractItems(response)`. Handles `fetch` + JSON parsing centrally.

### `src/base/reddit-adapter.ts`
Abstract base class targeting the public Reddit JSON API (`/r/{sub}/search.json`). No OAuth required. Supports keyword filtering client-side after fetch. Defines `RedditPost` type.

---

## Phase 4 — `packages/notion-client`

### `src/client.ts` — `NotionApiClient`
Wraps `@notionhq/client` with:
- **350ms minimum gap** between API calls (Notion's rate limit is ~3 req/sec)
- **5 retries** with exponential backoff starting at 500ms
- Single `call<T>(fn: (c: Client) => Promise<T>)` method — callers never touch the raw client

The wrapper pattern (rather than subclassing) keeps the Notion SDK's complex types contained in one place.

### `src/batched-writer.ts` — `BatchedWriter`
Queues Notion write operations and flushes them in serial batches of 10. Prevents creating hundreds of concurrent API calls when seeding pages.

---

## Phase 5 — `packages/deployer`

The deployer translates a `NichePack` JSON into a live Notion workspace in three passes:

### Pass 1 — Create databases
For each `database` in the pack, calls `databases.create` with the parent page ID and all non-relation properties. Builds a `databaseIds: Map<packId, notionId>` for use in later passes.

**Why split relations?** Notion relations require the *target database to already exist* when you create the relation property. Creating all databases first, then patching relations, is the only safe order.

### Pass 2 — Patch relations
`relation-resolver.ts` iterates every database looking for relation/rollup properties. Resolves `targetDatabaseId` (pack-local) → actual Notion database ID, then calls `databases.update` to patch the property in place. Supports both `dual_property` (bidirectional) and `single_property` relation types.

### Pass 3 — Seed pages
`seed-page-builder.ts` translates `SeedPage` property values to Notion API property shapes using type inference: `string → rich_text`, `number → number`, `boolean → checkbox`, `string[] → multi_select`.

### `src/property-builders.ts`
Handles all 22 Notion property types. Returns `{notionProperties, deferredRelations}` — relations are excluded from the first-pass `databases.create` call and deferred to the resolver.

**Type assertion note**: The Notion SDK's `databases.create` properties parameter has a deeply nested inferred type that TypeScript cannot widen. A single `as Parameters<typeof c.databases.create>[0]["properties"]` assertion at the call site keeps the real logic correct without fighting the SDK.

### Returns `DeployResult`
```typescript
{
  databaseIds: Record<string, string>;  // packId → notionId
  pagesCreated: number;
  durationMs: number;
}
```

---

## Phase 6 — `packages/exporter`

The inverse of the deployer. Reads a live Notion workspace and reconstructs a `NichePack` JSON.

**Round-trip contract**: `deploy(pack) → export() → deploy()` must produce the same workspace. This invariant is the correctness bar for both packages.

### `src/property-readers.ts`
Handles all 22 Notion property types in reverse. Returns `null` for types that can't be reconstructed from the Notion API response (e.g. formula expressions aren't returned by the databases API — only the result type is).

### `src/export.ts`
1. Builds a reverse ID map: `notionId → packId`
2. Calls `databases.retrieve` for each database in `databaseIds`
3. Maps properties via `readProperty`
4. Reverse-maps relation `targetDatabaseId` from Notion IDs back to pack IDs
5. Preserves non-Notion-storable fields (`dataSources`, `enrichmentPrompts`, `onboardingQuestions`, `views`, `seedPages`) verbatim from `existingPack`
6. Validates the result with `NichePackSchema.parse()`

**Why preserve from existingPack?** Notion's API doesn't store data-source credentials, enrichment prompt configs, or view filter expressions. These fields live only in the pack JSON, so they must survive the round-trip.

---

## Phase 7 — `packages/ai`

All AI calls go through this package. The Anthropic model used throughout is `claude-3-5-sonnet-20241022`.

### Prompt management
Prompts are versioned plain-text files in `packages/ai/prompts/`. The `loadPrompt(name, variables, version?)` function reads the file and substitutes `{{VARIABLE_NAME}}` template vars. This approach keeps prompts diff-able in git, reviewable without touching TypeScript, and independently versioned.

### Prompt files

| File | Purpose | Template vars |
|------|---------|---------------|
| `draft-niche-pack.v1.txt` | Generate a full NichePack from a description | `NICHE_DESCRIPTION` |
| `refine-niche-pack.v1.txt` | Modify an existing pack with user feedback | `EXISTING_PACK`, `USER_FEEDBACK` |
| `suggest-data-sources.v1.txt` | Recommend adapter types for a niche | `NICHE_DESCRIPTION`, `DATABASE_LIST` |

`draft-niche-pack.v1.txt` constrains Claude to produce output that passes `NichePackSchema.parse()`: min 3 databases, min 2 adapters, at least one formula, at least one relation, at least one board view.

### `src/generate.ts`
Calls Claude with the draft prompt, strips ```json fences from the response, then validates with `NichePackSchema.parse()`. Throws a descriptive error if validation fails (this will be surfaced in the UI).

### `src/refine.ts`
Same pattern as generate but sends the existing pack JSON as context alongside the user's feedback message.

### `src/scaffold-adapter.ts`
Generates a TypeScript adapter stub file string for a given `DataSource`. Selects the right base class (RssAdapter / RestAdapter / RedditAdapter) based on the source ID pattern, and includes `registerAdapter()` at the module level so the file is self-registering on import.

---

## Phase 8 — `packages/db`

### Tables

**`niche_packs`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | Matches `NichePack.id` |
| `name` | text | |
| `description` | text | |
| `version` | integer | Monotonically increasing per pack |
| `schema_snapshot` | jsonb | Full `NichePack` JSON at last save |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**`deploys`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | UUID |
| `niche_pack_id` | text FK | References `niche_packs.id` |
| `notion_parent_page_id` | text | The target Notion page |
| `database_id_map` | jsonb | `{packDbId: notionDbId}` |
| `status` | enum | `pending \| in_progress \| success \| failed` |
| `error_message` | text | Populated on failure |
| `duration_ms` | integer | Wall clock for the deploy |
| `created_at` | timestamptz | |
| `completed_at` | timestamptz | |

**`adapter_runs`** — scaffolded for v0.2 sync engine. Same status enum as deploys.

### `src/queries.ts`
Typed query helpers:
- `listNichePacks()` — ordered by `updated_at DESC`
- `getNichePack(id)` — single row or `undefined`
- `upsertNichePack(pack)` — insert or update on conflict
- `deleteNichePack(id)`
- `createDeploy(row)` — inserts a new deploy record
- `updateDeployStatus(id, update)` — patches status + completedAt
- `listDeploysByNiche(nichePackId)`

---

## Phase 9 — `apps/web`

Next.js 14 App Router. All pages are React Server Components by default; client interactivity is pushed to leaf components.

### Routes

| Route | Type | Purpose |
|-------|------|---------|
| `/` | Server | Redirects to `/niches` |
| `/niches` | Server | Lists all niche packs from DB |
| `/niches/[id]` | Server shell | Three-pane editor (AI chat · schema editor · Notion preview) |
| `/niches/new` | — | Same editor with no pre-loaded pack |

### API routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/niche` | GET | List all packs from DB |
| `/api/niche` | POST | Validate + upsert pack to DB |
| `/api/niche/[id]` | GET | Fetch single pack |
| `/api/niche/[id]` | DELETE | Remove pack |
| `/api/ai/draft` | POST | Generate pack + scaffold adapter stubs via Claude |
| `/api/ai/refine` | POST | Refine existing pack via Claude |
| `/api/deploy` | POST | Push pack to Notion, record deploy row |
| `/api/export` | POST | Pull pack from Notion |
| `/api/health` | GET | `{status:"ok"}` — used by Railway healthcheck |

### Three-pane editor layout (`/niches/[id]`)
- **Left pane (w-80)** — AI Assistant chat: describe changes in natural language, calls `/api/ai/draft` or `/api/ai/refine`
- **Center pane (flex-1)** — `schema.json` editor: raw JSON with syntax highlighting
- **Right pane (w-80)** — Notion Preview + Deploy / Pull buttons (calls `/api/deploy` and `/api/export`)

---

## Phase 10 — First Niche Pack: Real Estate Investor

Reference implementation that validates the entire stack.

### `niches/real-estate-investor/schema.json`

Three databases:

**Deal Pipeline** — 15 properties including:
- `70% Rule` — formula: `prop("ARV") * 0.7 - prop("Est. Rehab")`
- `Deal Score` — formula: compound expression scoring 0–100
- `Comps` — relation to Comps database (dual_property)
- `Tasks` — relation to Tasks database

**Comps** — 10 properties, `Price/Sqft` formula
**Tasks** — 8 properties

Three data sources: `zillow-rss` (no creds), `redfin-rss` (no creds), `propstream` (requires `PROPSTREAM_API_KEY`).

### Adapters

| File | Class | Base | Notes |
|------|-------|------|-------|
| `sources/zillow-rss.ts` | `ZillowRssAdapter` | `RssAdapter<Listing>` | Regex-parses price/beds/baths/sqft from description |
| `sources/redfin-rss.ts` | `RedfinRssAdapter` | `RssAdapter<Listing>` | Shares `Listing` type with Zillow adapter |
| `sources/propstream.ts` | `PropStreamAdapter` | `RestAdapter<PropStreamItem, Listing>` | Bearer auth, `buildRequest` injects API key |

### `scoring.ts`
Pure domain math, zero dependencies:
- `scoreDeal(inputs)` → `{maxOffer, margin, meetsSeventyPercentRule, dealScore (0–100)}`
- `estimateCashOnCash(inputs)` → BRRRR cash-on-cash return

### Enrichment prompts

| File | Template vars | Output |
|------|--------------|--------|
| `prompts/deal-scoring.v1.txt` | ADDRESS, ASKING_PRICE, ARV, REHAB_COST, STRATEGY, MARKET, BEDS, BATHS, SQFT | `{dealScore, meetsSeventyPercentRule, maxOffer, margin, redFlags, recommendedAction, summary}` |
| `prompts/deal-summary.v1.txt` | Same vars | Plain-text investor brief |

---

## What is not yet built (v0.2 scope)

| Item | Notes |
|------|-------|
| Sync engine | `adapterRuns` table is scaffolded; running adapters on a cron schedule is v0.2 |
| shadcn/ui components | Tailwind + CSS vars are configured; component CLI not yet run |
| Interactive editor panes | Chat input and JSON editor are structural shells — need client components |
| `fast-xml-parser` upgrade | RSS adapter uses regex parser; `fast-xml-parser` is the planned v0.2 replacement |
| CI / tests | No test suite yet; round-trip invariant (deploy → export → re-deploy) is the priority test to write |
| Stripe integration | `config.yaml` pricing fields are present; Stripe billing not wired |
| Multi-tenancy | Auth/users not yet modelled in the DB schema |

---

## Dependency versions

| Package | Version | Notes |
|---------|---------|-------|
| Next.js | 14.x | App Router |
| TypeScript | 5.x | |
| Drizzle ORM | 0.30.x | |
| `@notionhq/client` | 2.2.15 | Official Notion SDK |
| `@anthropic-ai/sdk` | 0.24.3 | Claude API |
| Zod | 3.23.8 | Schema validation |
| Tailwind CSS | 3.x | |
| pnpm | 10.33.2 | Workspace manager |

---

*Last updated: 2 May 2026*
