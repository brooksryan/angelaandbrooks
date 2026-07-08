import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The Next tsconfig leaves JSX untransformed ("preserve"); component tests
  // need the React plugin to compile it.
  plugins: [react()],
  test: {
    environment: "node",
    globals: false,
    // Picks up tests in src/, theme.config.test.ts at the project root (it
    // sits beside theme.config.ts, which lives at the root), and the
    // build-pipeline tests co-located with their scripts in scripts/.
    include: [
      "src/**/*.test.{ts,tsx}",
      "theme.config.test.ts",
      "scripts/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
