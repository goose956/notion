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
    description: Maximum number of result items to return (default 10, max 50)
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

## Required API Key

Set `APIFY_TOKEN` in the admin Settings page. Get a free token at https://apify.com (free tier: 5$/month compute credit).
