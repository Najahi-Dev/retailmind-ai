/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");
const SECRET = process.env.AUTH_SERVER_SECRET!;

async function seed(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const acme = await ctx.db.insert("organizations", {
      name: "Acme Supermarket", slug: "acme-supermarket", inviteCode: "A", plan: "growth", isActive: true, createdAt: Date.now(),
    });
    const other = await ctx.db.insert("organizations", {
      name: "Other Mart", slug: "other-mart", inviteCode: "B", plan: "growth", isActive: true, createdAt: Date.now(),
    });
    await ctx.db.insert("organizations", {
      name: "Closed Shop", slug: "closed-shop", inviteCode: "C", plan: "starter", isActive: false, createdAt: Date.now(),
    });
    const userId = await ctx.db.insert("users", {
      email: "staff@acme.com", name: "Staff", role: "staff", orgId: acme, isActive: true, createdAt: Date.now(),
    });
    return { acme, other, userId };
  });
}

describe("Find your workspace", () => {
  it("finds active workspaces by slug or by name, returning only public fields", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const bySlug = await t.mutation(api.workspaces.findWorkspace, { serverSecret: SECRET, query: "acme-supermarket", ip: "1.1.1.1" });
    expect(bySlug).toEqual({ name: "Acme Supermarket", slug: "acme-supermarket", logoUrl: null });
    const byName = await t.mutation(api.workspaces.findWorkspace, { serverSecret: SECRET, query: "  Acme Supermarket ", ip: "1.1.1.1" });
    expect(byName?.slug).toBe("acme-supermarket");
    expect(Object.keys(byName!)).not.toContain("inviteCode");
  });

  it("returns null for unknown or inactive workspaces", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    expect(await t.mutation(api.workspaces.findWorkspace, { serverSecret: SECRET, query: "nope", ip: "1.1.1.1" })).toBeNull();
    expect(await t.mutation(api.workspaces.findWorkspace, { serverSecret: SECRET, query: "closed-shop", ip: "1.1.1.1" })).toBeNull();
  });

  it("requires the server secret and rate-limits per IP", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    await expect(t.mutation(api.workspaces.findWorkspace, { serverSecret: "x", query: "acme", ip: "1.1.1.1" })).rejects.toThrow(/Forbidden/);
    for (let i = 0; i < 20; i++) {
      await t.mutation(api.workspaces.findWorkspace, { serverSecret: SECRET, query: `guess-${i}`, ip: "6.6.6.6" });
    }
    await expect(
      t.mutation(api.workspaces.findWorkspace, { serverSecret: SECRET, query: "acme-supermarket", ip: "6.6.6.6" }),
    ).rejects.toThrow(/Too many requests/);
  });

  it("workspace-scoped login rejects accounts from another workspace", async () => {
    const t = convexTest(schema, modules);
    const { userId } = await seed(t);
    const base = { userId, email: "staff@acme.com", ip: "1.1.1.1" };
    await expect(
      t.mutation(internal.authInternal.completeLogin, { ...base, refreshTokenHash: "h1", workspace: "other-mart" }),
    ).rejects.toThrow(/not a member of the "Other Mart" workspace/);
    const ok = await t.mutation(internal.authInternal.completeLogin, { ...base, refreshTokenHash: "h2", workspace: "acme-supermarket" });
    expect(ok.user._id).toBe(userId);
    const noWs = await t.mutation(internal.authInternal.completeLogin, { ...base, refreshTokenHash: "h3" });
    expect(noWs.user._id).toBe(userId);
  });
});
