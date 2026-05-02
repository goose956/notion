/**
 * CustomerCriteria — the operator- or customer-supplied filtering parameters
 * passed to an adapter's fetch() method. Each adapter narrows this to its
 * own criteria shape; the base type is a plain record so the registry can
 * pass criteria through without knowing the concrete adapter type.
 *
 * Adapters should define their own criteria type and accept it as a
 * constrained generic parameter:
 *
 *   class ZillowAdapter implements DataAdapter<ZillowItem, Listing, ZillowCriteria> { ... }
 */
export type CustomerCriteria = Record<string, unknown>;

/**
 * DataAdapter<RawType, Row, Criteria>
 *
 * The ONLY way data gets into a niche workspace. Every data source,
 * regardless of niche, conforms to this interface. Adapters live in
 * niches/[niche]/sources/*.ts and are loaded by the adapter registry.
 *
 * @typeParam RawType  - The raw shape returned by the external API / feed
 * @typeParam Row      - The normalized shape matching the niche's schema
 * @typeParam Criteria - Adapter-specific customer criteria (defaults to CustomerCriteria)
 *
 * Versioning:
 *   Bumping the adapter interface is a breaking change. Increment the
 *   ADAPTER_INTERFACE_VERSION constant below and update all adapter stubs.
 */
export interface DataAdapter<
  RawType = unknown,
  Row = unknown,
  Criteria extends CustomerCriteria = CustomerCriteria,
> {
  /**
   * Stable kebab-case identifier. Must match the `id` field in the niche
   * pack's DataSource declaration.
   * e.g. 'zillow-rss', 'reddit-keyword', 'hackernews'
   */
  readonly id: string;

  /**
   * The niche this adapter belongs to. Must match the niche pack's `id`.
   * e.g. 'real-estate-investor', 'newsletter-writer'
   */
  readonly niche: string;

  /**
   * Human-readable description shown in the UI.
   */
  readonly description: string;

  /**
   * Environment variable names OR customer-supplied credential keys that
   * this adapter requires before it can fetch. The runtime will validate
   * that all of these are present in `credentials` before calling fetch().
   *
   * Examples: ['PROPSTREAM_API_KEY'], ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET']
   */
  readonly requiredCredentials: readonly string[];

  /**
   * Fetch raw records from the external source.
   *
   * Returns an AsyncIterable so the runtime can stream/process records
   * incrementally instead of buffering everything in memory. This is
   * important for large feeds (e.g. Zillow RSS with thousands of listings).
   *
   * @param criteria    - Customer-specific filtering criteria
   * @param credentials - Map of credential key → secret value
   */
  fetch(
    criteria: Criteria,
    credentials: Readonly<Record<string, string>>,
  ): AsyncIterable<RawType>;

  /**
   * Normalize a single raw record into a Row that matches this niche pack's
   * target database schema. This function must be pure and synchronous.
   *
   * @param raw - One item as returned by fetch()
   * @returns   A Row ready to be written to Notion via the deployer
   */
  normalize(raw: RawType): Row;

  /**
   * Return a stable, deterministic string key for a normalized row.
   * The sync engine uses this to skip rows that have already been processed
   * (content-addressed deduplication). If the underlying record changes,
   * return a different key so it gets re-processed.
   *
   * Typical implementations: hash of the source URL, or `${source}:${id}`.
   *
   * @param row - A normalized Row as returned by normalize()
   */
  cacheKey(row: Row): string;
}

/**
 * Bumped when the DataAdapter interface has breaking changes.
 * Adapter stubs should reference this so the scaffolder can detect staleness.
 */
export const ADAPTER_INTERFACE_VERSION = 1 as const;
