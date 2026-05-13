---
name: enrich_record
description: Runs an AI prompt against provided context values and returns the generated text. Does NOT write to Notion — use notion_write for that.
inputs:
  prompt:
    type: string
    description: The prompt template. Use {{VARIABLE_NAME}} for substitutions.
    required: true
  context:
    type: object
    description: Key-value map substituted into the prompt template (replaces {{KEY}} with value).
  max_tokens:
    type: number
    description: Maximum output tokens. Defaults to 1024.
when_to_use: When you need to generate text from a prompt and context values — e.g. write a deal summary, score a record, draft a brief. Always follow with notion_write to persist the result.
---

## enrich_record

Calls Claude (or the configured model) with a rendered prompt and returns the generated text.

### Prompt templating

Use `{{UPPER_SNAKE_CASE}}` in the prompt string. All keys in `context` will be substituted before the call.

### Example

```json
{
  "prompt": "Score this deal 0-100. Address: {{ADDRESS}}, Asking: {{PRICE}}, ARV: {{ARV}}",
  "context": { "ADDRESS": "123 Main St", "PRICE": "$250,000", "ARV": "$380,000" },
  "max_tokens": 512
}
```

### Gotchas

- This skill does not need an Anthropic key itself — it is called inside an agent loop that already has the key configured. The key is resolved from the agent runner context.
- For simple single-shot enrichment, you can use this alone. For multi-step workflows, combine with notion_query (to read context) and notion_write (to persist results).
