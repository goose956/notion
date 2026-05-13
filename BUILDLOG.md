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
| Sync engine scheduler | Manual/API sync runs are live; cron-style scheduling/orchestration is still pending |
| shadcn/ui components | Tailwind + CSS vars are configured; component CLI not yet run |
| Interactive editor panes | Chat input and JSON editor are structural shells — need client components |
| `fast-xml-parser` upgrade | RSS adapter uses regex parser; `fast-xml-parser` is the planned v0.2 replacement |
| CI / tests | No test suite yet; round-trip invariant (deploy → export → re-deploy) is the priority test to write |
| Multi-tenancy | Auth/users not yet modelled in the DB schema |

---

## Phase 11 — Runtime Settings, Sync Mapping, and Apify Hardening (May 2026)

### Runtime app settings

Added a DB-backed settings layer for operational secrets and model configuration.

| File | Purpose |
|------|---------|
| `packages/db/src/schema.ts` | Added `app_settings` table schema and row types |
| `packages/db/drizzle/0004_app_settings.sql` | Migration creating `app_settings` |
| `packages/db/src/queries.ts` | Added `getSetting`, `getSettings`, `upsertSetting`, and `upsertSettings` helpers |
| `apps/web/src/app/api/settings/route.ts` | API for reading configured-state and writing settings values |
| `apps/web/src/app/(admin)/admin/settings/page.tsx` | Admin settings route |
| `apps/web/src/components/settings/settings-form.tsx` | Client form for Stripe + Anthropic settings |

### Runtime credential/model resolution

Updated API routes to prefer DB settings and retain environment variable fallback:

- `apps/web/src/app/api/checkout/route.ts`
- `apps/web/src/app/api/webhooks/stripe/route.ts`
- `apps/web/src/app/api/enrich/route.ts`

Also added admin navigation entry points for settings in:

- `apps/web/src/app/(admin)/layout.tsx`
- `apps/web/src/app/(admin)/admin/page.tsx`

### Sync engine typed Notion property mapping

`packages/sync-engine/src/runner.ts` now retrieves target database property metadata and maps row values by property type instead of generic first-string title behavior.

Implemented mappings include: `title`, `rich_text`, `number`, `checkbox`, `date`, `url`, `phone_number`, `email`, `status`, `select`, and `multi_select`.

`packages/sync-engine/src/runner.test.ts` now includes coverage validating typed mapping payloads.

### Sync and adapter observability

Added structured logs around sync lifecycle in `apps/web/src/app/api/sync/route.ts`:

- run start payload
- run error payload
- run result payload

### Apify Google Places adapter hardening

`niches/local-business-lead-tracker/sources/apify-google-places.ts` was upgraded to:

- create actor runs without `waitForFinish`
- poll run status via actor-run endpoint with bounded retries
- fail fast on terminal non-success statuses
- emit fetch/request/poll/summary logs
- track filter rejection reasons for diagnostics

Added `scripts/debug-apify-smoke.ts` to run a quick local smoke test against the adapter.

---

## Phase 12 — Bidirectional Notion Writes, Members Chat, and Split-Panel Research UI (May 2026)

### New agent tools

Added two new skills to `packages/agent-tools`:

**`notion_create` (`skills/notion_create/notion-create.ts`)**
Creates new pages in a Notion database. On each call it:
1. Calls `databases.retrieve` to fetch the live DB schema
2. Maps each incoming property value to the correct Notion property shape (`title`, `select`, `multi_select`, `url`, `email`, `phone_number`, `date`, `status`, `number`, `checkbox`, `rich_text`)
3. Calls `pages.create` and returns a success / error string

**`notion_archive` (`skills/notion_archive/notion-archive.ts`)**
Soft-deletes a Notion page via `pages.update({ archived: true })`. The tool description instructs the AI to run `notion_query` first to resolve the target `page_id`. Pages are recoverable from Notion Trash (Notion API has no hard-delete endpoint).

Both skills are registered in `packages/agent-tools/src/registry.ts` above the existing `notionWriteSkill` / `notionQuerySkill` entries.

### Members chat — tool enablement and model configuration

`apps/web/src/app/api/members/chat/route.ts` was updated:

- **Tool set expanded** — `MEMBER_TOOL_IDS` now includes `notion_create` and `notion_archive` in addition to the existing six tools.
- **Dynamic model resolution** — `resolveModel()` reads the `anthropic.model` setting from the `app_settings` DB table; falls back to `process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5"`. Default changed from `claude-sonnet-4-5` to `claude-haiku-4-5` to reduce per-request cost for tool-use tasks.
- **Structured output system prompt** — `BASE_SYSTEM_PROMPT` instructs Claude to respond with one summary sentence followed by a fenced `json` array when the user asks for lists. The array items must use the exact Notion property names from the deployed database.
- **Dynamic DB context injection** — On every request the route:
  1. Calls `listNichePacks()` to enumerate all packs
  2. Calls `getLatestDeployByNiche(id)` for each pack to retrieve `database_id_map`
  3. Calls `databases.retrieve` on each Notion DB to get property names + types
  4. Injects `database_id` and a property list (`Name (type)`) into the system prompt so Claude uses exact field names

### New DB query: `getLatestDeployByNiche`

Added to `packages/db/src/queries.ts`. Returns the most recent `status = 'success'` deploy row for a niche pack. Used by the chat route and the new databases endpoint.

### Deploy route saves `databaseIdMap`

`apps/web/src/app/api/deploy/route.ts` now passes `databaseIdMap: result.databaseIds` to `updateDeployStatus()`. Previously the map was discarded after deploy, so the members chat system prompt had no database IDs to inject.

`updateDeployStatus` in `packages/db/src/queries.ts` accepts an optional `databaseIdMap?: Record<string, string>` and persists it to the `database_id_map` column.

### New API endpoints

**`/api/members/databases` (GET)**
Returns all deployed Notion database IDs for the authenticated member. Response shape:
```typescript
{ databases: Array<{ nicheId, nicheName, dbId, dbName, notionId }> }
```
Enumerates all niche packs, gets their latest successful deploy, and flattens `databaseIdMap` into named entries.

**`/api/members/notion-add` (POST)**
Direct Notion page creation from the members UI — bypasses the AI layer. Body:
```typescript
{ notionDatabaseId: string, properties: Record<string, unknown> }
```
Calls `notionCreateSkill.handler` directly. Returns `502` if the skill returns an error string.

### Split-panel research UI

`apps/web/src/app/(members)/members/chat/page.tsx` was fully rewritten from a chat-bubble conversation view to a two-column research interface:

**Left panel (340 px, fixed)**
- Header with bot icon
- Live `ActivityFeed` — animated badges for each tool call (searching, fetching, writing) that turn solid on completion
- Suggested prompts list when idle
- Textarea + Send button pinned to the bottom

**Right panel (flex)**
- Idle splash screen with call-to-action copy
- Animated loading skeleton (3 cards) while Claude is researching
- On completion: summary paragraph + responsive card grid (1 col → 2 col on lg)
- Per-card **Add** button → `POST /api/members/notion-add`
- Toolbar with:
  - Result count + "N added to Notion" counter
  - Database selector (populated from `/api/members/databases`)
  - **Add all (N)** bulk button
- Error banner for failed Notion writes

Key helper functions added to the page:
- `parseResultItems(text)` — extracts the fenced `json` array from Claude's response
- `getSummaryText(text)` — returns the leading prose before the code fence
- `getItemTitle(item)` — picks the most likely title field from a result object
- `TOOL_LABELS` / `TOOL_ICON` / `resolveToolLabel()` — maps tool IDs to human-readable labels and Lucide icons for the activity feed

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

*Last updated: 13 May 2026*
