/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

describe("Organizations & Subscription Management", () => {
  let t: ReturnType<typeof convexTest>;
  let userAdminId: Id<"users">;
  let userStaffId: Id<"users">;
  let adminToken: string;
  let staffToken: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);

    userAdminId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "orgadmin@retailmind.com",
        name: "Org Administrator",
        role: "admin",
        isActive: true,
        createdAt: Date.now(),
      });
    });
    adminToken = "admin-org-token";
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        userId: userAdminId,
        token: adminToken,
        expiresAt: Date.now() + 86400000,
        createdAt: Date.now(),
      });
    });

    userStaffId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "orgstaff@retailmind.com",
        name: "Org Staff",
        role: "staff",
        isActive: true,
        createdAt: Date.now(),
      });
    });
    staffToken = "staff-org-token";
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        userId: userStaffId,
        token: staffToken,
        expiresAt: Date.now() + 86400000,
        createdAt: Date.now(),
      });
    });
  });

  it("creates a new organization with slug, invite code, and owner linkage", async () => {
    const res = await t.mutation(api.organizations.createOrganization, {
      token: adminToken,
      name: "Colombo Hyper Market",
      plan: "growth",
    });

    expect(res.orgId).toBeDefined();
    expect(res.slug).toBe("colombo-hyper-market");
    expect(res.inviteCode).toMatch(/^INV-[A-Z0-9]+$/);

    // Verify admin was switched to new org
    const user = await t.run(async (ctx) => ctx.db.get(userAdminId));
    expect(user?.orgId).toBe(res.orgId);
    expect(user?.plan).toBe("growth");

    // Staff cannot create organization
    await expect(
      t.mutation(api.organizations.createOrganization, {
        token: staffToken,
        name: "Unauthorized Market",
      })
    ).rejects.toThrow(/Access denied: Required role in \[admin, manager\]/i);
  });

  it("joins an organization using a valid invite code and rejects invalid codes", async () => {
    const { orgId, inviteCode } = await t.mutation(api.organizations.createOrganization, {
      token: adminToken,
      name: "Kandy Express Store",
      plan: "starter",
    });

    // Staff joins using valid invite code
    const joinRes = await t.mutation(api.organizations.joinOrganizationByInviteCode, {
      token: staffToken,
      inviteCode,
    });
    expect(joinRes.success).toBe(true);
    expect(joinRes.orgId).toBe(orgId);

    const updatedStaff = await t.run(async (ctx) => ctx.db.get(userStaffId));
    expect(updatedStaff?.orgId).toBe(orgId);

    // Attempting to join with an invalid invite code must fail
    await expect(
      t.mutation(api.organizations.joinOrganizationByInviteCode, {
        token: staffToken,
        inviteCode: "INVALID-CODE-999",
      })
    ).rejects.toThrow(/Invalid or expired workspace invitation code/i);
  });

  it("activates free trial once and strictly blocks second trial activations", async () => {
    await t.mutation(api.organizations.createOrganization, {
      token: adminToken,
      name: "Galle Trading Post",
      plan: "starter",
    });

    // 1. Activate first 14-day trial
    const trialRes = await t.mutation(api.organizations.activateFreeTrial, {
      token: adminToken,
      selectedPlan: "growth",
    });
    expect(trialRes.success).toBe(true);

    const trialStatus = await t.query(api.organizations.getTrialStatus, {
      token: adminToken,
    });
    expect(trialStatus?.subscriptionStatus).toBe("TRIALING");
    expect(trialStatus?.planTier).toBe("GROWTH");
    expect(trialStatus?.isTrialUsed).toBe(true);

    // 2. Attempting second free trial activation on same org MUST FAIL
    await expect(
      t.mutation(api.organizations.activateFreeTrial, {
        token: adminToken,
        selectedPlan: "growth",
      })
    ).rejects.toThrow(/Free trial has already been used for this organization/i);
  });

  it("activates paid subscription and updates organization tier to ACTIVE", async () => {
    await t.mutation(api.organizations.createOrganization, {
      token: adminToken,
      name: "Jaffna Wholesale Goods",
      plan: "starter",
    });

    await t.mutation(api.organizations.activateSubscription, {
      token: adminToken,
      plan: "growth",
    });

    const billing = await t.query(api.organizations.getWorkspaceBilling, {
      token: adminToken,
    });
    expect(billing?.subscriptionStatus).toBe("ACTIVE");
    expect(billing?.planTier).toBe("GROWTH");
  });
});
