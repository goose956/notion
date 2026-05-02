import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const PROMPTS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../prompts",
);

/**
 * Load a versioned prompt file and substitute template variables.
 *
 * @param name      - Prompt name without version or extension, e.g. 'draft-niche-pack'
 * @param version   - Version number, defaults to 1
 * @param variables - Map of VARIABLE_NAME → substitution value
 */
export async function loadPrompt(
  name: string,
  variables: Record<string, string>,
  version = 1,
): Promise<string> {
  const fileName = `${name}.v${version}.txt`;
  const filePath = join(PROMPTS_DIR, fileName);

  let template: string;
  try {
    template = await readFile(filePath, "utf-8");
  } catch {
    throw new Error(
      `Prompt file not found: ${fileName}. ` +
        `Expected at ${filePath}`,
    );
  }

  return substituteVariables(template, variables);
}

function substituteVariables(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_match, key: string) => {
    if (!(key in variables)) {
      throw new Error(
        `Prompt template references variable '{{${key}}}' but it was not provided`,
      );
    }
    return variables[key] ?? "";
  });
}
