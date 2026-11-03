/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { createTestSession } from "./lib/testAuth";
import * as orgModule from "./organizations";

const modules = import.meta.glob("./**/*.ts");

describe("Organizations & Subscription Management", () => {
  let t: ReturnType<typeof convexTest>;
  let homeOrgId: Id<"organizations">;
  let userAdminId: Id<"users">;
  let userStaffId: Id<"users">;
  let adminToken: string;
  let staffToken: string;

  beforeEach(async () => {
    t = convexTest(schema, modules);

    homeOrgId = await t.run(async (ctx) =>
      ctx.db.insert("organizations", {
        name: "Home Workspace",
        slug: "home-workspace",
        inviteCode: "HOME-INVITE-CODE-123456",
        plan: "starter",
        isActive: true,
        createdAt: Date.now(),
      }),
    );

    userAdminId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        orgId: homeOrgId,
        email: "orgadmin@retailmind.com",
        name: "Org Administrator",
        role: "admin",
        isActive: true,
        createdAt: Date.now(),
      }),
    );
    await t.run(async (ctx) => ctx.db.patch(homeOrgId, { ownerId: userAdminId }));
    adminToken = await createTestSession(t, userAdminId);

    userStaffId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        orgId: homeOrgId,
        email: "orgstaff@retailmind.com",
        name: "Org Staff",
        role: "staff",
        isActive: true,
        createdAt: Date.now(),
      }),
    );
    staffToken = await createTestSession(t, userStaffId);
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
      }),
    ).rejects.toThrow(/Access denied: Required role in \[admin, manager\]/i);
  });

  it("joining by invite code drops privileges to pending and rejects invalid codes", async () => {
    // A second, independent workspace with its own admin.
    const otherOrgId = await t.run(async (ctx) =>
      ctx.db.insert("organizations", {
        name: "Kandy Express Store",
        slug: "kandy-express",
        inviteCode: "KANDY-INVITE-CODE-123456",
        plan: "starter",
        isActive: true,
        createdAt: Date.now(),
      }),
    );

    // Attempting to join with an invalid invite code must fail
    await expect(
      t.mutation(api.organizations.joinOrganizationByInviteCode, {
        token: staffToken,
        inviteCode: "INVALID-CODE-999",
      }),
    ).rejects.toThrow(/Invalid or expired workspace invitation code/i);

    // Workspace owner cannot abandon their org via an invite code
    await expect(
      t.mutation(api.organizations.joinOrganizationByInviteCode, {
        token: adminToken,
        inviteCode: "KANDY-INVITE-CODE-123456",
      }),
    ).rejects.toThrow(/owners cannot leave/i);

    // Staff joins using valid invite code -> becomes pending in the new org
    const joinRes = await t.mutation(api.organizations.joinOrganizationByInviteCode, {
      token: staffToken,
      inviteCode: "KANDY-INVITE-CODE-123456",
    });
    expect(joinRes.success).toBe(true);
    expect(joinRes.orgId).toBe(otherOrgId);

    const updatedStaff = await t.run(async (ctx) => ctx.db.get(userStaffId));
    expect(updatedStaff?.orgId).toBe(otherOrgId);
    expect(updatedStaff?.role).toBe("pending");

    // Pending users cannot use their old session any more
    await expect(
      t.query(api.organizations.getWorkspaceBilling, { token: staffToken }),
    ).rejects.toThrow(/Unauthorized/i);
  });

  it("an admin joining by invite code does not keep the admin role", async () => {
    const secondAdminId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        orgId: homeOrgId,
        email: "secondadmin@retailmind.com",
        name: "Second Admin",
        role: "admin",
        isActive: true,
        createdAt: Date.now(),
      }),
    );
    const secondAdminToken = await createTestSession(t, secondAdminId);
    await t.run(async (ctx) =>
      ctx.db.insert("organizations", {
        name: "Victim Org",
        slug: "victim-org",
        inviteCode: "VICTIM-INVITE-CODE-123456",
        plan: "growth",
        isActive: true,
        createdAt: Date.now(),
      }),
    );
    await t.mutation(api.organizations.joinOrganizationByInviteCode, {
      token: secondAdminToken,
      inviteCode: "VICTIM-INVITE-CODE-123456",
    });
    const after = await t.run(async (ctx) => ctx.db.get(secondAdminId));
    expect(after?.role).toBe("pending");
  });

  it("switching to a workspace the user is not a member of is rejected", async () => {
    const foreignOrgId = await t.run(async (ctx) =>
      ctx.db.insert("organizations", {
        name: "Foreign Org",
        slug: "foreign-org",
        inviteCode: "FOREIGN-INVITE-CODE-123456",
        plan: "enterprise",
        isActive: true,
        createdAt: Date.now(),
      }),
    );

    await expect(
      t.mutation(api.organizations.switchActiveOrganization, {
        token: adminToken,
        orgId: foreignOrgId,
      }),
    ).rejects.toThrow(/not a member/i);
    await expect(
      t.mutation(api.organizations.switchActiveOrganization, {
        token: staffToken,
        orgId: foreignOrgId,
      }),
    ).rejects.toThrow(/not a member/i);

    const admin = await t.run(async (ctx) => ctx.db.get(userAdminId));
    expect(admin?.orgId).toBe(homeOrgId);

    // Switching between workspaces the user owns is allowed
    const { orgId: ownedOrgId } = await t.mutation(api.organizations.createOrganization, {
      token: adminToken,
      name: "Second Owned Store",
    });
    await t.mutation(api.organizations.switchActiveOrganization, {
      token: adminToken,
      orgId: homeOrgId,
    });
    expect((await t.run(async (ctx) => ctx.db.get(userAdminId)))?.orgId).toBe(homeOrgId);
    await t.mutation(api.organizations.switchActiveOrganization, {
      token: adminToken,
      orgId: ownedOrgId,
    });
    expect((await t.run(async (ctx) => ctx.db.get(userAdminId)))?.orgId).toBe(ownedOrgId);
  });

  it("activates free trial once and strictly blocks second trial activations", async () => {
    await t.mutation(api.organizations.createOrganization, {
      token: adminToken,
      name: "Galle Trading Post",
      plan: "starter",
    });

    // Staff may not activate trials
    await expect(
      t.mutation(api.organizations.activateFreeTrial, { token: staffToken, selectedPlan: "growth" }),
    ).rejects.toThrow(/Access denied/i);

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
      }),
    ).rejects.toThrow(/Free trial has already been used for this organization/i);
  });

  it("paid activation is internal-only and updates organization tier to ACTIVE", async () => {
    // No public activateSubscription / free-upgrade endpoints remain
    expect((orgModule.activateSubscription as any).isInternal).toBe(true);
    expect((orgModule.syncCurrentOrgToGrowth as any).isInternal).toBe(true);
    expect((orgModule.forceUpgradeWorkspaceToGrowth as any).isInternal).toBe(true);

    await t.mutation(internal.organizations.activateSubscription, {
      orgId: homeOrgId,
      plan: "growth",
    });

    const billing = await t.query(api.organizations.getWorkspaceBilling, {
      token: adminToken,
    });
    expect(billing?.subscriptionStatus).toBe("ACTIVE");
    expect(billing?.planTier).toBe("GROWTH");
  });

  it("Stripe server mutations reject calls without the server secret", async () => {
    await expect(
      t.mutation(api.organizations.updateSubscriptionFromStripeInternal, {
        orgId: homeOrgId,
        planTier: "ENTERPRISE",
        subscriptionStatus: "ACTIVE",
      } as any),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.organizations.updateSubscriptionFromStripeInternal, {
        serverSecret: "wrong-secret",
        orgId: homeOrgId,
        planTier: "ENTERPRISE",
        subscriptionStatus: "ACTIVE",
      }),
    ).rejects.toThrow(/Forbidden/);
    await expect(
      t.mutation(api.organizations.updateStripeCustomerIdInternal, {
        serverSecret: "wrong-secret",
        orgId: homeOrgId,
        stripeCustomerId: "cus_evil",
      }),
    ).rejects.toThrow(/Forbidden/);
    await expect(
      t.mutation(api.organizations.downgradeSubscriptionInternal, {
        serverSecret: "wrong-secret",
        orgId: homeOrgId,
      }),
    ).rejects.toThrow(/Forbidden/);
    await expect(
      t.mutation(api.billingEngine.logStripeWebhookFailure, {
        serverSecret: "wrong-secret",
        eventId: "evt_1",
        eventType: "x",
        payload: "{}",
        error: "e",
      }),
    ).rejects.toThrow(/Forbidden/);

    const org = await t.run(async (ctx) => ctx.db.get(homeOrgId));
    expect(org?.planTier).toBeUndefined();
    expect(org?.stripeCustomerId).toBeUndefined();

    // With the correct secret the webhook update applies
    const res = await t.mutation(api.organizations.updateSubscriptionFromStripeInternal, {
      serverSecret: process.env.AUTH_SERVER_SECRET!,
      orgId: homeOrgId,
      planTier: "ENTERPRISE",
      subscriptionStatus: "ACTIVE",
    });
    expect(res.success).toBe(true);
    const upgraded = await t.run(async (ctx) => ctx.db.get(homeOrgId));
    expect(upgraded?.planTier).toBe("ENTERPRISE");
  });
});
