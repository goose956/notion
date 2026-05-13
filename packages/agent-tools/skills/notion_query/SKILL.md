---
name: notion_query
description: Reads properties from an existing Notion page or queries a database for matching pages.
inputs:
  mode:
    type: string
    description: Either "page" to read a single page by ID, or "database" to query a database.
    required: true
  id:
    type: string
    description: Page ID (mode=page) or database ID (mode=database).
    required: true
  filter_property:
    type: string
    description: (mode=database only) Property name to filter by.
  filter_value:
    type: string
    description: (mode=database only) Value to match against filter_property (text contains match).
  limit:
    type: number
    description: (mode=database only) Maximum results to return. Defaults to 10.
when_to_use: At the start of an agent run to read existing Notion data for context — e.g. read a briefing page, fetch related records, or check whether a page already has content before overwriting.
---

## notion_query

Reads data from Notion — either a single page's properties or a filtered database query.

### mode=page

Returns a JSON object of all property values for the page. Useful for reading briefing documents, existing records, or checking current state before writing.

### mode=database

Runs a simple text-contains filter on a single property and returns matching pages (up to `limit`). Useful for finding related records.

### Example (read page)

```json
{ "mode": "page", "id": "1a2b3c..." }
```

Returns: `{ "Title": "My Deal", "Status": "Active", "Deal Score": 72 }`

### Example (query database)

```json
{ "mode": "database", "id": "db-uuid", "filter_property": "Status", "filter_value": "Needs Review", "limit": 5 }
```

### Gotchas

- Only text (rich_text/title), number, checkbox, select, and date properties are returned. Complex types (relation, rollup, formula) are returned as their plain value or omitted.
- Results are JSON-stringified and returned as a string for Claude to reason about.
