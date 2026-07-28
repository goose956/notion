---
name: run_apify
description: Run any Apify actor to scrape websites, collect structured data, or use the Apify marketplace. Waits for completion and returns the dataset results.
inputs:
  actor_id:
    type: string
    description: The Apify actor ID in format "username/actor-name" (e.g. "apify/google-search-scraper")
    required: true
  input:
    type: object
    description: The actor input configuration (see the actor's documentation for available options)
    required: true
  max_items:
    type: number
    description: Maximum charged dataset items for supported Actors and result items to return (default 10, max 50)
    required: false
  max_total_charge_usd:
    type: number
    description: Maximum total Actor run charge in USD
    required: false
when_to_use: When you need to scrape a website, run Google Places searches, collect lead data, or use any of Apify's 1000+ pre-built scrapers. Requires APIFY_TOKEN in settings.
---

# run_apify

Runs an Apify actor synchronously (waits up to 60 seconds) and returns the results as JSON.

## Popular Actors

- `apify/google-search-scraper` — Google search results
- `compass/google-maps-scraper` — Google Maps / local businesses  
- `apify/website-content-crawler` — Full website crawl
- `vaclavrut/google-places-detail` — Google Places details

## X Actors

- [`xquik/x-tweet-scraper`](https://apify.com/xquik/x-tweet-scraper):
  posts, search, profiles, threads, replies, quotes, and engagement
- [`xquik/x-follower-scraper`](https://apify.com/xquik/x-follower-scraper):
  followers, following, verified followers, lists, communities, and overlap

Use a bounded tweet search:

```json
{
  "actor_id": "xquik/x-tweet-scraper",
  "input": {
    "mode": "search",
    "searchTerms": ["AI lang:en"],
    "maxItems": 20
  },
  "max_items": 20,
  "max_total_charge_usd": 1
}
```

Use a bounded follower run:

```json
{
  "actor_id": "xquik/x-follower-scraper",
  "input": {
    "twitterHandles": ["nasa"],
    "relation": "followers",
    "maxItems": 20,
    "maxItemsPerTarget": 20
  },
  "max_items": 20,
  "max_total_charge_usd": 1
}
```

Check the current Store schema and pricing before every run. Confirm paid runs
first. A result retrieval limit alone does not limit run cost.

## Required API Key

Set `APIFY_TOKEN` in the admin Settings page. The runtime sends it in an
authorization header and never places it in a URL.

Xquik is an independent third-party service. Not affiliated with X Corp. "Twitter" and "X" are trademarks of X Corp.
