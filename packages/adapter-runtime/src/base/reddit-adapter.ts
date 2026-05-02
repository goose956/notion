import type { DataAdapter, CustomerCriteria } from "../interface.js";

export interface RedditAdapterCriteria extends CustomerCriteria {
  subreddits: string[];
  keywords: string[];
  /** Number of posts to fetch per subreddit. Default: 25, max: 100 */
  limit?: number;
  /** 'hot' | 'new' | 'top' */
  sort?: "hot" | "new" | "top";
}

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  author: string;
  score: number;
  numComments: number;
  createdUtc: number;
  subreddit: string;
  flair: string | undefined;
}

/**
 * RedditAdapter — abstract base class for Reddit-based data sources.
 *
 * Uses the public Reddit JSON API (no OAuth required for read-only access).
 * Concrete adapters implement normalize() and cacheKey() for their niche.
 */
export abstract class RedditAdapter<Row = unknown>
  implements DataAdapter<RedditPost, Row, RedditAdapterCriteria>
{
  abstract readonly id: string;
  abstract readonly niche: string;
  abstract readonly description: string;

  /** Reddit doesn't require credentials for public feeds */
  readonly requiredCredentials: readonly string[] = [];

  async *fetch(
    criteria: RedditAdapterCriteria,
    _credentials: Readonly<Record<string, string>>,
  ): AsyncIterable<RedditPost> {
    const limit = criteria.limit ?? 25;
    const sort = criteria.sort ?? "new";

    for (const subreddit of criteria.subreddits) {
      const url = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}`;
      const response = await fetch(url, {
        headers: { "User-Agent": "niche-factory/0.1 (bot)" },
      });
      if (!response.ok) {
        throw new Error(
          `Reddit fetch failed for r/${subreddit}: HTTP ${response.status}`,
        );
      }

      const body = (await response.json()) as RedditListingResponse;
      const posts = body.data.children.map((c) => mapPost(c.data, subreddit));

      for (const post of posts) {
        if (matchesKeywords(post, criteria.keywords)) {
          yield post;
        }
      }
    }
  }

  abstract normalize(raw: RedditPost): Row;
  abstract cacheKey(row: Row): string;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

interface RedditListingResponse {
  data: {
    children: Array<{ data: RedditPostRaw }>;
  };
}

interface RedditPostRaw {
  id: string;
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  subreddit: string;
  link_flair_text: string | null;
}

function mapPost(raw: RedditPostRaw, subreddit: string): RedditPost {
  return {
    id: raw.id,
    title: raw.title,
    selftext: raw.selftext,
    url: raw.url,
    permalink: `https://reddit.com${raw.permalink}`,
    author: raw.author,
    score: raw.score,
    numComments: raw.num_comments,
    createdUtc: raw.created_utc,
    subreddit,
    flair: raw.link_flair_text ?? undefined,
  };
}

function matchesKeywords(post: RedditPost, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const text = `${post.title} ${post.selftext}`.toLowerCase();
  return keywords.some((kw) => text.includes(kw.toLowerCase()));
}
