import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Allow .js imports to resolve to .ts sources (TypeScript ESM convention)
    extensionAlias: {
      ".js": [".ts", ".js"],
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["packages/*/src/**/*.test.ts", "packages/*/tests/**/*.test.ts"],
    // Tell vitest to resolve .js imports as .ts (monorepo TypeScript ESM)
    alias: [
      {
        find: /^(.*)\.(js)$/,
        replacement: "$1.ts",
      },
    ],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.test.ts"],
    },
  },
});
