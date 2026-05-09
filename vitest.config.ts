import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // Picks up tests in src/, plus theme.config.test.ts at the project root
    // (theme.config.ts itself lives at the root per the PRD).
    include: ["src/**/*.test.{ts,tsx}", "theme.config.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
