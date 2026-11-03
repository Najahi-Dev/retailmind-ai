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
    env: {
      JWT_SECRET: "test-only-jwt-secret-0123456789abcdef0123456789abcdef",
      AUTH_SERVER_SECRET: "test-only-server-secret-0123456789abcdef0123456789",
    },
    include: ["convex/**/*.test.ts", "lib/**/*.test.ts", "test/**/*.test.ts", "app/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/agent-skills/**", "**/.next/**"],
    server: {
      deps: {
        inline: ["convex-test"],
      },
    },
  },
});
