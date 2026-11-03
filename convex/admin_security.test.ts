/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { createTestSession } from "./lib/testAuth";
import * as wipeDb from "./wipeDb";
import * as seed from "./seed";
import * as reactivateOrgs from "./reactivateOrgs";
import * as superAdminModule from "./superAdmin";
import * as migration from "./migrations/multiTenantMigration";
import * as organizations from "./organizations";
import * as users from "./users";

const modules = import.meta.glob("./**/*.ts");

describe("User administration & super-admin security", () => {
  let t: ReturnType<typeof convexTest>;
  let orgA: Id<"organizations">;
  let orgB: Id<"organizations">;
  let adminA: Id<"users">;
  let managerA: Id<"users">;
  let staffA: Id<"users">;
  let adminB: Id<"users">;
  let superAdmin: Id<"users">;
  let adminAToken: string;
  let managerAToken: string;
  let staffAToken: string;
  let superToken: string;

  const mkOrg = (name: string) =>
    t.run(async (ctx: any) =>
      ctx.db.insert("organizations", {
        name,
        slug: name.toLowerCase(),
        inviteCode: `${name.toUpperCase()}-CODE-1234567890`,
        plan: "growth",
        isActive: true,
        createdAt: Date.now(),
      }),
    );
  const mkUser = (orgId: Id<"organizations"> | undefined, email: string, role: any) =>
    t.run(async (ctx: any) =>
      ctx.db.insert("users", {
        orgId,
        email,
        name: email.split("@")[0],
        role,
        isActive: true,
        passwordHash: "$2b$12$secret-hash-should-never-leak",
        createdAt: Date.now(),
      }),
    );

  beforeEach(async () => {
    t = convexTest(schema, modules);
    orgA = await mkOrg("OrgA");
    orgB = await mkOrg("OrgB");
    adminA = await mkUser(orgA, "admin@a.com", "admin");
    managerA = await mkUser(orgA, "manager@a.com", "manager");
    staffA = await mkUser(orgA, "staff@a.com", "staff");
    adminB = await mkUser(orgB, "admin@b.com", "admin");
    superAdmin = await mkUser(undefined, "root@platform.com", "super_admin");
    await t.run(async (ctx) => ctx.db.patch(orgA, { ownerId: adminA }));
    adminAToken = await createTestSession(t, adminA);
    managerAToken = await createTestSession(t, managerA);
    staffAToken = await createTestSession(t, staffA);
    superToken = await createTestSession(t, superAdmin);
  });

  it("updateUserRole requires authentication and same-org admin rights", async () => {
    await expect(
      t.mutation(api.users.updateUserRole, { userId: staffA, role: "admin" }),
    ).rejects.toThrow(/Unauthorized/);
    await expect(
      t.mutation(api.users.updateUserRole, { token: "garbage", userId: staffA, role: "admin" }),
    ).rejects.toThrow(/Unauthorized/);
    // Cross-org
    await expect(
      t.mutation(api.users.updateUserRole, { token: adminAToken, userId: adminB, role: "staff" }),
    ).rejects.toThrow(/not found in your organization/i);
    // Self role change
    await expect(
      t.mutation(api.users.updateUserRole, { token: adminAToken, userId: adminA, role: "staff" }),
    ).rejects.toThrow(/own role/i);
    // Staff cannot change roles
    await expect(
      t.mutation(api.users.updateUserRole, { token: staffAToken, userId: managerA, role: "staff" }),
    ).rejects.toThrow(/Access denied/i);
    // Manager cannot promote to admin, nor modify an admin
    await expect(
      t.mutation(api.users.updateUserRole, { token: managerAToken, userId: staffA, role: "admin" }),
    ).rejects.toThrow(/Only administrators/i);
    await expect(
      t.mutation(api.users.updateUserRole, { token: managerAToken, userId: adminA, role: "staff" }),
    ).rejects.toThrow(/Managers cannot modify administrator/i);
    // super_admin is never assignable (validator)
    await expect(
      t.mutation(api.users.updateUserRole, {
        token: adminAToken,
        userId: staffA,
        role: "super_admin" as any,
      }),
    ).rejects.toThrow();
    // Tenant admin cannot touch a super admin
    await expect(
      t.mutation(api.users.updateUserRole, { token: adminAToken, userId: superAdmin, role: "staff" }),
    ).rejects.toThrow();

    // Legit change works
    await t.mutation(api.users.updateUserRole, { token: adminAToken, userId: staffA, role: "manager" });
    expect((await t.run(async (ctx) => ctx.db.get(staffA)))?.role).toBe("manager");
  });

  it("createUser requires authentication and an admin/manager caller", async () => {
    await expect(
      t.action(api.users.createUser, { name: "Mallory", email: "m@evil.com", role: "admin" }),
    ).rejects.toThrow(/Unauthorized/);
    await expect(
      t.action(api.users.createUser, {
        token: staffAToken,
        name: "Mallory",
        email: "m@evil.com",
        role: "staff",
      }),
    ).rejects.toThrow(/Access denied/i);
    await expect(
      t.action(api.users.createUser, {
        token: managerAToken,
        name: "Mallory",
        email: "m@evil.com",
        role: "admin",
      }),
    ).rejects.toThrow(/Only administrators/i);
    // Weak admin-supplied passwords are rejected
    await expect(
      t.action(api.users.createUser, {
        token: adminAToken,
        name: "Weak",
        email: "weak@a.com",
        role: "staff",
        password: "retailmind123",
      }),
    ).rejects.toThrow(/Password/);

    const res = await t.action(api.users.createUser, {
      token: adminAToken,
      name: "New Staff",
      email: "NewStaff@A.com",
      role: "staff",
    });
    expect(res.temporaryPassword).toBeDefined();
    expect(res.temporaryPassword).not.toBe("retailmind123");
    expect(res.temporaryPassword!.length).toBeGreaterThanOrEqual(16);
    const created = await t.run(async (ctx) => ctx.db.get(res.userId));
    expect(created?.orgId).toBe(orgA);
    expect(created?.email).toBe("newstaff@a.com");
    expect(created?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
  }, 30000);

  it("deactivation is mandatory-auth and revokes the target's sessions", async () => {
    await expect(
      t.mutation(api.users.toggleUserStatus, { userId: staffA, isActive: false }),
    ).rejects.toThrow(/Unauthorized/);
    await expect(
      t.mutation(api.users.toggleUserStatus, { token: adminAToken, userId: adminB, isActive: false }),
    ).rejects.toThrow(/not found in your organization/i);

    await t.mutation(api.users.toggleUserStatus, { token: adminAToken, userId: staffA, isActive: false });
    const sessions = await t.run(async (ctx: any) =>
      ctx.db.query("sessions").withIndex("by_user", (q: any) => q.eq("userId", staffA)).collect(),
    );
    expect(sessions.every((s: any) => s.revokedAt)).toBe(true);
    await expect(t.query(api.users.getUserById, { token: staffAToken, userId: staffA })).rejects.toThrow(
      /Unauthorized/,
    );
  });

  it("updateUserFullDetail / profile image / getUserById enforce auth and org scope", async () => {
    const base = { userId: adminB, name: "X", role: "staff" as const, isActive: true };
    await expect(t.mutation(api.users.updateUserFullDetail, base)).rejects.toThrow(/Unauthorized/);
    await expect(
      t.mutation(api.users.updateUserFullDetail, { ...base, token: adminAToken }),
    ).rejects.toThrow(/not found in your organization/i);
    // Staff may edit own name but not own role/status
    await t.mutation(api.users.updateUserFullDetail, {
      token: staffAToken,
      userId: staffA,
      name: "Renamed",
      role: "staff",
      isActive: true,
    });
    await expect(
      t.mutation(api.users.updateUserFullDetail, {
        token: staffAToken,
        userId: staffA,
        name: "Renamed",
        role: "admin",
        isActive: true,
      }),
    ).rejects.toThrow(/own role/i);

    await expect(
      t.mutation(api.users.updateUserProfileImage, { userId: adminB, imageUrl: "https://x/y.png" }),
    ).rejects.toThrow(/Unauthorized/);
    await expect(
      t.mutation(api.users.updateUserProfileImage, {
        token: staffAToken,
        userId: adminA,
        imageUrl: "https://x/y.png",
      }),
    ).rejects.toThrow(/Access denied/i);

    await expect(t.query(api.users.getUserById, { userId: adminB })).rejects.toThrow(/Unauthorized/);
    await expect(
      t.query(api.users.getUserById, { token: adminAToken, userId: adminB }),
    ).rejects.toThrow(/another workspace/i);
    const u = await t.query(api.users.getUserById, { token: adminAToken, userId: staffA });
    expect(u).not.toBeNull();
    expect((u as any).passwordHash).toBeUndefined();

    await expect(t.mutation(api.users.generateUploadUrl, {})).rejects.toThrow(/Unauthorized/);
  });

  it("getUsers never leaks password hashes or other tenants", async () => {
    const list = await t.query(api.users.getUsers, { token: adminAToken });
    expect(list.length).toBe(3);
    for (const u of list) {
      expect((u as any).passwordHash).toBeUndefined();
      expect(u.orgId).toBe(orgA);
    }
    expect(await t.query(api.users.getUsers, { token: staffAToken })).toEqual([]);
    expect(await t.query(api.users.getUsers, {})).toEqual([]);

    const platform = await t.query(api.usersAdmin.getAllPlatformUsers, { token: superToken });
    for (const u of platform) expect((u as any).passwordHash).toBeUndefined();
    await expect(
      t.query(api.usersAdmin.getAllPlatformUsers, { token: adminAToken }),
    ).rejects.toThrow(/Super administrator/i);
  });

  it("impersonation issues a short-lived token that cannot reach super-admin functions", async () => {
    await expect(
      t.mutation(api.superAdmin.generateImpersonationToken, {
        token: adminAToken,
        targetUserId: staffA,
        reason: "x",
      }),
    ).rejects.toThrow(/Super administrator/i);

    const otherSuper = await mkUser(undefined, "root2@platform.com", "super_admin");
    await expect(
      t.mutation(api.superAdmin.generateImpersonationToken, {
        token: superToken,
        targetUserId: otherSuper,
        reason: "support",
      }),
    ).rejects.toThrow(/cannot be impersonated/i);

    const res = await t.mutation(api.superAdmin.generateImpersonationToken, {
      token: superToken,
      targetUserId: adminA,
      reason: "support ticket #42",
    });
    expect(typeof res.token).toBe("string");
    expect(res.expiresAt).toBeLessThanOrEqual(Date.now() + 60 * 60 * 1000 + 1000);
    expect((res.user as any).passwordHash).toBeUndefined();

    // Works as the target user
    const me = await t.query(api.users.getCurrentUserRecord, { token: res.token });
    expect(me?._id).toBe(adminA);
    expect(me?.isImpersonating).toBe(true);

    // Session is marked as impersonation and audit-logged
    const session = await t.run(async (ctx: any) =>
      ctx.db
        .query("sessions")
        .withIndex("by_user", (q: any) => q.eq("userId", adminA))
        .filter((q: any) => q.neq(q.field("impersonatedBy"), undefined))
        .first(),
    );
    expect(session?.impersonatedBy).toBe(superAdmin);
    const logs = await t.run(async (ctx) => ctx.db.query("adminAuditLogs").collect());
    expect(logs.some((l) => l.action === "IMPERSONATE" && l.targetUserId === adminA)).toBe(true);

    // Cannot call super-admin functions
    await expect(
      t.query(api.superAdmin.getPlatformMetrics, { token: res.token }),
    ).rejects.toThrow(/Super administrator|Not available while impersonating/i);
    await expect(
      t.mutation(api.superAdmin.generateImpersonationToken, {
        token: res.token,
        targetUserId: staffA,
        reason: "chain",
      }),
    ).rejects.toThrow();
  });

  it("dangerous maintenance functions are no longer public", () => {
    const mustBeInternal = [
      wipeDb.wipeBatchChunk,
      wipeDb.getDatabaseRecordCounts,
      seed.clearDatabase,
      seed.clearSuggestions,
      seed.seedBase,
      seed.seedProductsBatch,
      seed.seedInventory,
      seed.seedMovementsBatch,
      seed.seedPurchaseOrders,
      seed.seedAlertsAndReorders,
      seed.seedPriceSuggestions,
      reactivateOrgs.default,
      superAdminModule.emergencyReactivateOrgs,
      migration.migrateToMultiTenant,
      organizations.activateSubscription,
      organizations.syncCurrentOrgToGrowth,
      organizations.forceUpgradeWorkspaceToGrowth,
    ];
    for (const fn of mustBeInternal) {
      expect((fn as any).isInternal).toBe(true);
      expect((fn as any).isPublic).toBeFalsy();
    }
    expect((users as any).changePassword).toBeUndefined();
    expect((seed as any).seedUsers).toBeUndefined();
  });

  it("backup export is admin-only and restore drops foreign ids", async () => {
    await expect(
      t.mutation(api.adminBackup.exportFullDatabaseBackup, { token: staffAToken }),
    ).rejects.toThrow(/Access denied/i);
    await expect(t.mutation(api.adminBackup.exportFullDatabaseBackup, {})).rejects.toThrow(
      /Unauthorized/,
    );

    // A product that belongs to org B
    const foreignProduct = await t.run(async (ctx: any) =>
      ctx.db.insert("products", {
        orgId: orgB,
        sku: "B-1",
        name: "B product",
        unit: "pcs",
        costPrice: 1,
        sellingPrice: 2,
        reorderPoint: 1,
        safetyStock: 1,
        trackBatches: false,
        isActive: true,
        createdAt: Date.now(),
      } as any),
    );
    await t.mutation(api.adminBackup.restoreFullDatabaseBackup, {
      token: adminAToken,
      backupJsonString: JSON.stringify({
        data: {
          alerts: [{ productId: foreignProduct, message: "x", type: "system" }],
          priceSuggestions: [{ productId: foreignProduct, currentPrice: 1, suggestedPrice: 2 }],
        },
      }),
    });
    const alerts = await t.run(async (ctx) => ctx.db.query("alerts").collect());
    expect(alerts.every((a) => a.productId === undefined)).toBe(true);
    const ps = await t.run(async (ctx) => ctx.db.query("priceSuggestions").collect());
    expect(ps.length).toBe(0);
  });
});
