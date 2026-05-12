---
name: web_search
description: Search the internet for current information using the Serper.dev API. Returns titles, URLs, and snippets for organic search results.
inputs:
  query:
    type: string
    description: The search query string
    required: true
  num_results:
    type: number
    description: Number of results to return (default 5, max 10)
    required: false
when_to_use: When you need up-to-date information from the web, want to research a topic, verify facts, find news, or look up current prices and market data. Requires SERPER_API_KEY.
---

# web_search

Performs a Google search via Serper.dev and returns organic results with title, URL, and snippet.

## Required API Key

Set `SERPER_API_KEY` in the admin Settings page (or as an environment variable). Get a free key at https://serper.dev.
