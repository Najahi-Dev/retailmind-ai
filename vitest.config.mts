import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
    },
  },
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts", "lib/**/*.test.ts", "test/**/*.test.ts", "app/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/agent-skills/**", "**/.next/**"],
    server: {
      deps: {
        inline: ["convex-test"],
      },
    },
  },
});
