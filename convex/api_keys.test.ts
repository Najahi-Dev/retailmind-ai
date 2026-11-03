/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { createTestSession } from "./lib/testAuth";
import { sha256Hex } from "./lib/jwt";

const modules = import.meta.glob("./**/*.ts");

describe("Platform API keys", () => {
  it("stores only a SHA-256 hash, returns the raw key once, and hides hashes", async () => {
    const t = convexTest(schema, modules);
    const adminId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "root@x.com", name: "Root", role: "super_admin", isActive: true, createdAt: Date.now() }),
    );
    const token = await createTestSession(t, adminId);

    const { rawKey } = await t.action(api.workflowAdmin.createApiKey, { token, name: "Integration" });
    expect(rawKey).toMatch(/^rmk_live_[A-Za-z0-9_-]{43}$/);

    const stored = await t.run(async (ctx) => ctx.db.query("platformApiKeys").first());
    expect(stored!.keyHash).toBe(await sha256Hex(rawKey));
    expect(stored!.keyHash).not.toContain(rawKey);

    const listed = await t.query(api.workflowAdmin.getApiKeys, { token });
    expect((listed[0] as any).keyHash).toBeUndefined();
  });

  it("rejects non super admins", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", { name: "A", slug: "a", inviteCode: "A", plan: "growth", isActive: true, createdAt: Date.now() });
      return ctx.db.insert("users", { email: "a@x.com", name: "A", role: "admin", orgId, isActive: true, createdAt: Date.now() });
    });
    const token = await createTestSession(t, userId);
    await expect(t.action(api.workflowAdmin.createApiKey, { token, name: "x" })).rejects.toThrow(/Access denied/);
    await expect(t.action(api.workflowAdmin.createApiKey, { name: "x" })).rejects.toThrow(/Access denied/);
  });
});
