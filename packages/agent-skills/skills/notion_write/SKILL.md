---
name: notion_write
description: Writes one or more property values to an existing Notion page.
inputs:
  page_id:
    type: string
    description: The Notion page ID to update (32-char hex or hyphenated UUID).
    required: true
  properties:
    type: object
    description: Object mapping Notion property names to their new values. Strings are written as rich_text; numbers as number; booleans as checkbox.
    required: true
when_to_use: After generating or enriching content, to persist the result back into a Notion page. Use this as the final step of any workflow that produces output.
---

## notion_write

Writes property values to a Notion page using the pages.update API.

### Supported value types

| Value type | Notion property type |
|------------|----------------------|
| `string`   | rich_text (2000 char limit, auto-truncated) |
| `number`   | number |
| `boolean`  | checkbox |

### Example

```json
{
  "page_id": "1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p",
  "properties": {
    "Summary": "AI-generated deal brief...",
    "Deal Score": 78,
    "Flagged": false
  }
}
```

### Gotchas

- Relation, formula, rollup, and created_by properties are read-only — do not attempt to write them.
- Property names are case-sensitive and must match the Notion database exactly.
- If no `notionToken` is available for the customer, this skill returns an error string instead of throwing.
