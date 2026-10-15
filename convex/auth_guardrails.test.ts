/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

describe("Multi-Tenant RBAC & Auth Guardrails", () => {
  it("rejects unauthorized access when no session token is provided", async () => {
    const t = convexTest(schema, modules);

    // Attempting to create category without token should fail
    await expect(
      t.mutation(api.inventory.addCategory, {
        name: "Beverages",
      })
    ).rejects.toThrow(/Unauthorized/i);
  });

  it("rejects when an expired session token is provided", async () => {
    const t = convexTest(schema, modules);

    // Seed org, user, and expired session
    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Acme Retail",
        slug: "acme-retail",
        inviteCode: "ACME123",
        plan: "growth",
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "manager@acme.com",
        name: "Manager Alice",
        role: "manager",
        orgId,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const expiredToken = "expired-token-123";
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        userId,
        orgId,
        token: expiredToken,
        expiresAt: Date.now() - 10000, // expired in the past
        createdAt: Date.now() - 50000,
      });
    });

    await expect(
      t.mutation(api.inventory.addCategory, {
        token: expiredToken,
        name: "Beverages",
      })
    ).rejects.toThrow(/Unauthorized/i);
  });

  it("rejects non-admin/manager roles from creating categories", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Acme Retail",
        slug: "acme-retail",
        inviteCode: "ACME123",
        plan: "growth",
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const staffId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "staff@acme.com",
        name: "Staff Bob",
        role: "staff", // Staff role
        orgId,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const staffToken = "staff-token-456";
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        userId: staffId,
        orgId,
        token: staffToken,
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
      });
    });

    // Staff role should be refused: required role in [admin, manager]
    await expect(
      t.mutation(api.inventory.addCategory, {
        token: staffToken,
        name: "Restricted Category",
      })
    ).rejects.toThrow(/Access denied: Required role in \[admin, manager\]/i);
  });

  it("allows admin or manager to add category within their organization", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Acme Retail",
        slug: "acme-retail",
        inviteCode: "ACME123",
        plan: "growth",
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const managerId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "manager@acme.com",
        name: "Manager Alice",
        role: "manager",
        orgId,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const managerToken = "manager-token-789";
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        userId: managerId,
        orgId,
        token: managerToken,
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
      });
    });

    const categoryId = await t.mutation(api.inventory.addCategory, {
      token: managerToken,
      name: "Beverages",
      description: "Soft drinks and juices",
    });

    expect(categoryId).toBeDefined();

    // Query categories for org
    const categories = await t.query(api.inventory.getCategories, {
      token: managerToken,
    });

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe("Beverages");
  });

  it("enforces tenant data scoping: Org A cannot see Org B categories", async () => {
    const t = convexTest(schema, modules);

    // Setup Org A
    const orgAId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Org Alpha",
        slug: "org-alpha",
        inviteCode: "ALPHA1",
        plan: "growth",
        isActive: true,
        createdAt: Date.now(),
      });
    });
    const userAId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "alice@alpha.com",
        name: "Alice Alpha",
        role: "admin",
        orgId: orgAId,
        isActive: true,
        createdAt: Date.now(),
      });
    });
    const tokenA = "token-alpha";
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        userId: userAId,
        orgId: orgAId,
        token: tokenA,
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
      });
    });

    // Setup Org B
    const orgBId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Org Beta",
        slug: "org-beta",
        inviteCode: "BETA1",
        plan: "growth",
        isActive: true,
        createdAt: Date.now(),
      });
    });
    const userBId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "bob@beta.com",
        name: "Bob Beta",
        role: "admin",
        orgId: orgBId,
        isActive: true,
        createdAt: Date.now(),
      });
    });
    const tokenB = "token-beta";
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        userId: userBId,
        orgId: orgBId,
        token: tokenB,
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
      });
    });

    // Org A adds Category A
    await t.mutation(api.inventory.addCategory, {
      token: tokenA,
      name: "Alpha Only Electronics",
    });

    // Org B adds Category B
    await t.mutation(api.inventory.addCategory, {
      token: tokenB,
      name: "Beta Only Groceries",
    });

    // Org A queries categories - must ONLY see Alpha categories
    const categoriesA = await t.query(api.inventory.getCategories, {
      token: tokenA,
    });
    expect(categoriesA.map((c) => c.name)).toEqual(["Alpha Only Electronics"]);
    expect(categoriesA.map((c) => c.name)).not.toContain("Beta Only Groceries");

    // Org B queries categories - must ONLY see Beta categories
    const categoriesB = await t.query(api.inventory.getCategories, {
      token: tokenB,
    });
    expect(categoriesB.map((c) => c.name)).toEqual(["Beta Only Groceries"]);
    expect(categoriesB.map((c) => c.name)).not.toContain("Alpha Only Electronics");
  });

  it("blocks tenant users from accessing APIs and returns null from getCurrentUserRecord when organization is CANCELED", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Suspended Org",
        slug: "suspended-org",
        inviteCode: "SUSP1",
        plan: "enterprise",
        subscriptionStatus: "CANCELED",
        isActive: false,
        createdAt: Date.now(),
      });
    });

    const tenantAdminId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "admin@suspended.com",
        name: "Admin User",
        role: "admin",
        orgId,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const tenantToken = "tenant-token-suspended-123";
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        userId: tenantAdminId,
        orgId,
        token: tenantToken,
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
      });
    });

    // 1. Live session watcher query must return null (forcing client-side logout)
    const liveRecord = await t.query(api.users.getCurrentUserRecord, {
      token: tenantToken,
    });
    expect(liveRecord).toBeNull();

    // 2. Mutations/queries through roleGuard must be rejected
    await expect(
      t.mutation(api.inventory.addCategory, {
        token: tenantToken,
        name: "Should Fail",
      })
    ).rejects.toThrow(/Unauthorized: Invalid session or account deactivated|Forbidden: Organization account is suspended or canceled/i);
  });

  it("purges all active tenant sessions when super admin updates status to CANCELED", async () => {
    const t = convexTest(schema, modules);

    // 1. Create Super Admin
    const superAdminId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "super@retailmind.com",
        name: "Super Admin",
        role: "super_admin",
        isActive: true,
        createdAt: Date.now(),
      });
    });
    const superToken = "super-token-999";
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        userId: superAdminId,
        token: superToken,
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
      });
    });

    // 2. Create Active Organization and Tenant User
    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Active Org",
        slug: "active-org",
        inviteCode: "ACT1",
        plan: "growth",
        subscriptionStatus: "ACTIVE",
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const tenantUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "user@active.com",
        name: "Active User",
        role: "admin",
        orgId,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const tenantUserToken = "tenant-user-token-777";
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        userId: tenantUserId,
        orgId,
        token: tenantUserToken,
        expiresAt: Date.now() + 3600000,
        createdAt: Date.now(),
      });
    });

    // Verify session exists before suspension
    const sessionBefore = await t.run(async (ctx) => {
      return await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("token", tenantUserToken))
        .first();
    });
    expect(sessionBefore).not.toBeNull();

    // 3. Super admin suspends organization
    await t.mutation(api.superAdmin.updateOrganizationStatus, {
      token: superToken,
      orgId,
      updates: {
        subscriptionStatus: "CANCELED",
      },
    });

    // 4. Verify organization is marked inactive and canceled
    const orgAfter = await t.run(async (ctx) => {
      return await ctx.db.get(orgId);
    });
    expect(orgAfter?.subscriptionStatus).toBe("CANCELED");
    expect(orgAfter?.isActive).toBe(false);

    // 5. Verify tenant user's session was completely purged from database
    const sessionAfter = await t.run(async (ctx) => {
      return await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("token", tenantUserToken))
        .first();
    });
    expect(sessionAfter).toBeNull();
  });
});
