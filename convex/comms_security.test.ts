/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { createTestSession } from "./lib/testAuth";

const modules = import.meta.glob("./**/*.ts");

type T = ReturnType<typeof convexTest>;

async function seedOrg(t: T, slug: string) {
  const orgId = await t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      name: `Org ${slug}`,
      slug,
      inviteCode: `INV-${slug}`,
      plan: "growth",
      planTier: "GROWTH",
      subscriptionStatus: "ACTIVE",
      isActive: true,
      createdAt: Date.now(),
    }),
  );
  const mkUser = (role: "admin" | "staff", suffix: string) =>
    t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: `${suffix}@${slug}.test`,
        name: `${role} ${slug}`,
        role,
        orgId,
        isActive: true,
        createdAt: Date.now(),
      }),
    );
  const adminId = await mkUser("admin", "admin");
  const staffId = await mkUser("staff", "staff");
  const productId = await t.run(async (ctx) =>
    ctx.db.insert("products", {
      orgId,
      sku: `SKU-${slug}`,
      name: `Product ${slug}`,
      unit: "pcs",
      costPrice: 1,
      sellingPrice: 2,
      reorderPoint: 5,
      safetyStock: 1,
      trackBatches: false,
      isActive: true,
      createdAt: Date.now(),
    }),
  );
  return {
    orgId,
    adminId,
    staffId,
    productId,
    adminToken: await createTestSession(t, adminId),
    staffToken: await createTestSession(t, staffId),
  };
}

describe("communications / forecasting / alerts / tickets / audit security", () => {
  let t: T;
  let a: Awaited<ReturnType<typeof seedOrg>>;
  let b: Awaited<ReturnType<typeof seedOrg>>;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    a = await seedOrg(t, "org-a");
    b = await seedOrg(t, "org-b");
  });

  it("rejects unauthenticated forecasting reads", async () => {
    await expect(t.query(api.forecasting.getForecastOverview, {})).rejects.toThrow();
    await expect(t.query(api.forecasting.getAIInsights, {})).rejects.toThrow();
    await expect(t.query(api.forecasting.getAllActiveProducts, {})).rejects.toThrow();
    await expect(
      t.query(api.forecasting.getProductData, { productId: a.productId }),
    ).rejects.toThrow();
    await expect(
      t.query(api.forecasting.getProductForecasts, { productId: a.productId }),
    ).rejects.toThrow();
    await expect(
      t.query(api.forecasting.getSeasonalTrends, { productId: a.productId }),
    ).rejects.toThrow();
  });

  it("scopes forecasting reads to the caller's organization", async () => {
    const products = await t.query(api.forecasting.getAllActiveProducts, { token: a.adminToken });
    expect(products.map((p) => p._id)).toEqual([a.productId]);

    const own = await t.query(api.forecasting.getProductData, {
      token: a.adminToken,
      productId: a.productId,
    });
    expect(own.product._id).toBe(a.productId);

    await expect(
      t.query(api.forecasting.getProductData, { token: a.adminToken, productId: b.productId }),
    ).rejects.toThrow(/another organization/);
    await expect(
      t.query(api.forecasting.getSeasonalTrends, { token: a.adminToken, productId: b.productId }),
    ).rejects.toThrow(/another organization/);
  });

  it("rejects user-triggered forecast runs without a session or by staff", async () => {
    await expect(t.action(api.forecasting.generateOrgForecasts, {})).rejects.toThrow();
    await expect(
      t.action(api.forecasting.generateOrgForecasts, { token: a.staffToken }),
    ).rejects.toThrow(/Access denied/);
  });

  it("prevents dismissing, snoozing or deleting another org's alert", async () => {
    const alertId = await t.mutation(api.alerts.createAlert, {
      token: a.adminToken,
      type: "system",
      priority: "low",
      message: "Org A alert",
    });

    await expect(
      t.mutation(api.alerts.dismissAlert, { token: b.adminToken, alertId }),
    ).rejects.toThrow(/another organization/);
    await expect(
      t.mutation(api.alerts.snoozeAlert, { token: b.adminToken, alertId, snoozeHours: 1 }),
    ).rejects.toThrow(/another organization/);
    await expect(
      t.mutation(api.alerts.markAlertRead, { token: b.adminToken, alertId }),
    ).rejects.toThrow(/another organization/);
    await expect(t.mutation(api.alerts.dismissAlert, { alertId })).rejects.toThrow();

    const alert = await t.run(async (ctx) => ctx.db.get(alertId));
    expect(alert?.isDismissed).toBe(false);
    expect(alert?.snoozedUntil).toBeUndefined();

    // Owner org can still dismiss it.
    await t.mutation(api.alerts.dismissAlert, { token: a.adminToken, alertId });
    const after = await t.run(async (ctx) => ctx.db.get(alertId));
    expect(after?.isDismissed).toBe(true);
  });

  it("restricts org-wide notification preferences to admins/managers", async () => {
    await expect(
      t.mutation(api.alerts.saveNotificationPreferences, {
        token: a.staffToken,
        preferences: { channels: { email: true } },
      }),
    ).rejects.toThrow(/Access denied/);
    const res = await t.mutation(api.alerts.saveNotificationPreferences, {
      token: a.adminToken,
      preferences: { channels: { email: true } },
    });
    expect(res.success).toBe(true);
  });

  it("isolates support tickets between organizations", async () => {
    const { id: ticketA } = await t.mutation(api.supportTickets.createTicket, {
      token: a.staffToken,
      subject: "Help A",
      category: "billing",
      priority: "low",
      details: "Org A issue",
    });
    await t.mutation(api.supportTickets.createTicket, {
      token: b.staffToken,
      subject: "Help B",
      category: "billing",
      priority: "low",
      details: "Org B issue",
    });

    const aTickets = await t.query(api.supportTickets.getUserTickets, { token: a.adminToken });
    expect(aTickets.map((x) => x.subject)).toEqual(["Help A"]);
    const bTickets = await t.query(api.supportTickets.getUserTickets, { token: b.adminToken });
    expect(bTickets.map((x) => x.subject)).toEqual(["Help B"]);

    await expect(
      t.mutation(api.supportTickets.respondToTicket, {
        token: b.adminToken,
        ticketDbId: ticketA,
        adminResponse: "pwned",
        status: "closed",
      }),
    ).rejects.toThrow(/another organization/);
    await expect(
      t.mutation(api.supportTickets.deleteTicket, { token: b.adminToken, ticketDbId: ticketA }),
    ).rejects.toThrow(/Access Denied/);

    // Same-org admin may respond.
    await t.mutation(api.supportTickets.respondToTicket, {
      token: a.adminToken,
      ticketDbId: ticketA,
      adminResponse: "On it",
      status: "in_progress",
    });
    const ticket = await t.run(async (ctx) => ctx.db.get(ticketA));
    expect(ticket?.adminResponse).toBe("On it");
  });

  it("requires super admin (or org admin, scoped) for getSecurityLogs", async () => {
    await t.run(async (ctx) => {
      await ctx.db.insert("securityLogs", {
        orgId: a.orgId,
        eventType: "IDOR_ATTEMPT",
        details: "org a event",
        createdAt: Date.now(),
      });
      await ctx.db.insert("securityLogs", {
        orgId: b.orgId,
        eventType: "IDOR_ATTEMPT",
        details: "org b event",
        createdAt: Date.now(),
      });
    });

    await expect(t.query(api.audit.getSecurityLogs, {})).rejects.toThrow();
    await expect(
      t.query(api.audit.getSecurityLogs, { token: a.staffToken }),
    ).rejects.toThrow(/Access denied/);

    const orgAdminLogs = await t.query(api.audit.getSecurityLogs, { token: a.adminToken });
    expect(orgAdminLogs.map((l) => l.details)).toEqual(["org a event"]);

    const superId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "root@platform.test",
        name: "Root",
        role: "super_admin",
        isActive: true,
        createdAt: Date.now(),
      }),
    );
    const superToken = await createTestSession(t, superId);
    const allLogs = await t.query(api.audit.getSecurityLogs, { token: superToken });
    expect(allLogs.length).toBe(2);
  });
});
