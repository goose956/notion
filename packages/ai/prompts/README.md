Prompts in this directory are versioned text files consumed by packages/ai/src/prompt-loader.ts.

## Naming convention

  <purpose>.v<N>.txt

- `N` starts at 1 and increments on breaking changes
- Non-breaking tweaks (tone, wording) are fine without a version bump
- Breaking change = different output schema, added/removed required template vars

## Template variables

Prompts may contain `{{VARIABLE_NAME}}` placeholders. The AI package
substitutes these before sending to the Claude API.

## Current prompts

| File | Purpose | Template vars |
|------|---------|---------------|
| draft-niche-pack.v1.txt | Generate a full niche pack from a description | `NICHE_DESCRIPTION` |
| refine-niche-pack.v1.txt | Modify an existing pack based on feedback | `CURRENT_PACK`, `FEEDBACK` |
| suggest-data-sources.v1.txt | Recommend adapters for a niche | `NICHE_DESCRIPTION`, `DATABASE_LIST` |
