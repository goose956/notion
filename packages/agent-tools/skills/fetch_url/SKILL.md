---
name: fetch_url
description: Fetch and return the readable text content of any public URL. Strips HTML tags and returns clean text, limited to 5000 characters.
inputs:
  url:
    type: string
    description: The full URL to fetch (must start with http:// or https://)
    required: true
when_to_use: When you need to read the content of a specific webpage, article, or API endpoint. No API key required. Use web_search first to find URLs, then fetch_url to read them.
---

# fetch_url

Fetches a URL and returns the visible text content with HTML stripped. Useful for reading articles, product pages, or any public webpage.

## Limits

- Timeout: 15 seconds
- Content capped at 5000 characters
- Only works with public URLs (no login-gated pages)
