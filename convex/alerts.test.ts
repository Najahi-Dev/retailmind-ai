/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { createTestSession } from "./lib/testAuth";

const modules = import.meta.glob("./**/*.ts");

describe("Alerts & Notification Lifecycle", () => {
  let t: ReturnType<typeof convexTest<typeof schema.tables>>;
  let orgId: Id<"organizations">;
  let adminId: Id<"users">;
  let adminToken: string;
  let warehouseId: Id<"locations">;
  let categoryId: Id<"categories">;
  let productId: Id<"products">;

  beforeEach(async () => {
    t = convexTest(schema, modules);

    orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Alerts Test Org",
        slug: "alerts-test-org",
        inviteCode: "ALERT123",
        plan: "growth",
        isActive: true,
        createdAt: Date.now(),
      });
    });

    adminId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "alertsadmin@test.com",
        name: "Alerts Admin",
        role: "admin",
        orgId,
        isActive: true,
        createdAt: Date.now(),
      });
    });
    adminToken = await createTestSession(t, adminId);

    warehouseId = await t.mutation(api.inventory.addLocation, {
      token: adminToken,
      name: "Alerts Warehouse",
      type: "warehouse",
    });

    categoryId = await t.mutation(api.inventory.addCategory, {
      token: adminToken,
      name: "Snacks",
    });

    productId = await t.mutation(api.inventory.createProduct, {
      token: adminToken,
      sku: "SKU-CHIPS",
      name: "Potato Chips 50g",
      unit: "pcs",
      costPrice: 50,
      sellingPrice: 90,
      reorderPoint: 40,
      safetyStock: 10,
      trackBatches: false,
      categoryId,
      initialLocationId: warehouseId,
      initialQuantity: 5,
    });
  });

  it("creates alerts with priority and calculates unread count accurately", async () => {
    // Create critical alert
    const alert1Id = await t.mutation(api.alerts.createAlert, {
      token: adminToken,
      type: "critical_stock",
      priority: "critical",
      message: "Potato Chips stock has fallen below safety stock threshold (5 units left).",
      productId,
    });
    expect(alert1Id).toBeDefined();

    // Create high priority alert
    const alert2Id = await t.mutation(api.alerts.createAlert, {
      token: adminToken,
      type: "demand_spike",
      priority: "high",
      message: "Unusual sales volume detected for Snacks category.",
    });
    expect(alert2Id).toBeDefined();

    // Verify unread count
    const unread = await t.query(api.alerts.getUnreadCount, {
      token: adminToken,
    });
    expect(unread.unread).toBe(2);
    expect(unread.critical).toBe(1);

    // Verify alerts listing includes joined product details and correct priority sorting
    const alerts = await t.query(api.alerts.getAlerts, {
      token: adminToken,
    });
    expect(alerts.length).toBe(2);
    // Critical alert must come first
    expect(alerts[0].priority).toBe("critical");
    expect(alerts[0].product?.sku).toBe("SKU-CHIPS");
    expect(alerts[1].priority).toBe("high");
  });

  it("snoozes an alert and hides it from the active alerts query until expiry", async () => {
    const alertId = await t.mutation(api.alerts.createAlert, {
      token: adminToken,
      type: "low_stock",
      priority: "medium",
      message: "Inventory approaching reorder threshold.",
      productId,
    });

    // Verify visible initially
    const initialAlerts = await t.query(api.alerts.getAlerts, { token: adminToken });
    expect(initialAlerts.some((a) => a._id === alertId)).toBe(true);

    // Snooze for 4 hours
    await t.mutation(api.alerts.snoozeAlert, {
      token: adminToken,
      alertId,
      snoozeHours: 4,
    });

    // Query active alerts - snoozed alert must NOT appear
    const snoozedAlerts = await t.query(api.alerts.getAlerts, { token: adminToken });
    expect(snoozedAlerts.some((a) => a._id === alertId)).toBe(false);
  });

  it("dismisses an alert and marks alert as read / resolved", async () => {
    const alertId = await t.mutation(api.alerts.createAlert, {
      token: adminToken,
      type: "system",
      priority: "low",
      message: "Scheduled background optimization completed.",
    });

    // Dismiss alert
    await t.mutation(api.alerts.dismissAlert, {
      token: adminToken,
      alertId,
    });

    const activeAlerts = await t.query(api.alerts.getAlerts, { token: adminToken });
    expect(activeAlerts.some((a) => a._id === alertId)).toBe(false);

    // Mark as read deletes the alert record
    const anotherAlertId = await t.mutation(api.alerts.createAlert, {
      token: adminToken,
      type: "supplier_delay",
      priority: "high",
      message: "Supplier shipment delayed by 2 days.",
    });

    await t.mutation(api.alerts.markAlertRead, {
      token: adminToken,
      alertId: anotherAlertId,
    });

    const unread = await t.query(api.alerts.getUnreadCount, { token: adminToken });
    expect(unread.unread).toBe(0);
  });
});
