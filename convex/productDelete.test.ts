/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { createTestSession } from "./lib/testAuth";
import { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

describe("Permanent product deletion", () => {
  let t: ReturnType<typeof convexTest>;
  let orgId: Id<"organizations">;
  let adminToken: string;
  let managerToken: string;
  let otherOrgToken: string;
  let warehouseId: Id<"locations">;
  let storeId: Id<"locations">;
  let productId: Id<"products">;

  beforeEach(async () => {
    vi.useFakeTimers();
    t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        name: "Acme", slug: "acme", inviteCode: "ACME1", plan: "growth", isActive: true, createdAt: Date.now(),
      });
      const otherOrg = await ctx.db.insert("organizations", {
        name: "Other", slug: "other", inviteCode: "OTH1", plan: "growth", isActive: true, createdAt: Date.now(),
      });
      const admin = await ctx.db.insert("users", {
        email: "a@acme.com", name: "Admin", role: "admin", orgId, isActive: true, createdAt: Date.now(),
      });
      const manager = await ctx.db.insert("users", {
        email: "m@acme.com", name: "Manager", role: "manager", orgId, isActive: true, createdAt: Date.now(),
      });
      const otherAdmin = await ctx.db.insert("users", {
        email: "a@other.com", name: "Other Admin", role: "admin", orgId: otherOrg, isActive: true, createdAt: Date.now(),
      });
      return { orgId, admin, manager, otherAdmin };
    });
    orgId = ids.orgId;
    adminToken = await createTestSession(t, ids.admin);
    managerToken = await createTestSession(t, ids.manager);
    otherOrgToken = await createTestSession(t, ids.otherAdmin);

    warehouseId = await t.mutation(api.inventory.addLocation, {
      token: adminToken, name: "Warehouse", type: "warehouse", address: "1 St",
    });
    storeId = await t.mutation(api.inventory.addLocation, {
      token: adminToken, name: "Store", type: "store", address: "2 St",
    });
    productId = await t.mutation(api.inventory.createProduct, {
      token: adminToken, sku: "SKU-DEL-1", name: "Delete Me Soap", unit: "pcs",
      costPrice: 50, sellingPrice: 80, reorderPoint: 10, safetyStock: 2, trackBatches: false,
      initialLocationId: warehouseId, initialQuantity: 30,
    });
    await t.mutation(api.inventory.recordStockIn, {
      token: adminToken, productId, locationId: storeId, quantity: 5,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const countFor = (pid: Id<"products">) =>
    t.run(async (ctx) => {
      const by = async (table: "inventory" | "stockMovements" | "forecasts" | "reorderSuggestions" | "priceSuggestions" | "alerts") =>
        (await ctx.db.query(table).collect()).filter((r) => r.productId === pid).length;
      return {
        product: (await ctx.db.get(pid)) ? 1 : 0,
        inventory: await by("inventory"),
        stockMovements: await by("stockMovements"),
        forecasts: await by("forecasts"),
        reorderSuggestions: await by("reorderSuggestions"),
        alerts: await by("alerts"),
      };
    });

  it("removes the product and all its related rows", async () => {
    await t.run(async (ctx) => {
      await ctx.db.insert("alerts", {
        orgId, productId, type: "low_stock", priority: "high", message: "Low stock",
        isRead: false, isDismissed: false, createdAt: Date.now(),
      });
    });

    const impact = await t.query(api.inventory.getProductDeletionImpact, { token: adminToken, productId });
    expect(impact.blockers).toEqual([]);
    expect(impact.counts.locations).toBe(2);
    expect(impact.counts.onHand).toBe(35);
    expect(impact.counts.stockMovements).toBeGreaterThanOrEqual(1);

    const res = await t.mutation(api.inventory.deleteProductPermanently, {
      token: adminToken, productId, confirmSku: "SKU-DEL-1",
    });
    expect(res.deleted.inventory).toBe(2);
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(await countFor(productId)).toEqual({
      product: 0, inventory: 0, stockMovements: 0, forecasts: 0, reorderSuggestions: 0, alerts: 0,
    });
    const overview = await t.query(api.inventory.getInventoryOverview, { token: adminToken });
    expect(overview.filter(Boolean).some((r) => r!.sku === "SKU-DEL-1")).toBe(false);
  });

  it("requires the exact SKU, admin role, and same org", async () => {
    await expect(
      t.mutation(api.inventory.deleteProductPermanently, { token: adminToken, productId, confirmSku: "SKU-DEL" }),
    ).rejects.toThrow(/does not match/i);
    await expect(
      t.mutation(api.inventory.deleteProductPermanently, { token: managerToken, productId, confirmSku: "SKU-DEL-1" }),
    ).rejects.toThrow(/Access denied/i);
    await expect(
      t.mutation(api.inventory.deleteProductPermanently, { token: otherOrgToken, productId, confirmSku: "SKU-DEL-1" }),
    ).rejects.toThrow(/another organization|Access Denied/i);
    expect((await countFor(productId)).product).toBe(1);
  });

  it("is blocked by an open purchase order and by reserved stock", async () => {
    await t.run(async (ctx) => {
      const supplierId = await ctx.db.insert("suppliers", {
        orgId, name: "Sup", email: "s@x.com", leadTimeDays: 3, status: "active", isActive: true, createdAt: Date.now(),
      } as never);
      await ctx.db.insert("purchaseOrders", {
        orgId, supplierId, poNumber: "PO-OPEN-1", status: "sent",
        lineItems: [{ productId, quantityOrdered: 10, unitCost: 50 }],
        totalValue: 500, createdAt: Date.now(), updatedAt: Date.now(),
      });
    });
    const impact = await t.query(api.inventory.getProductDeletionImpact, { token: adminToken, productId });
    expect(impact.blockers.join(" ")).toMatch(/PO-OPEN-1/);
    await expect(
      t.mutation(api.inventory.deleteProductPermanently, { token: adminToken, productId, confirmSku: "SKU-DEL-1" }),
    ).rejects.toThrow(/open purchase order/i);

    // Close the PO, then reserve stock instead
    await t.run(async (ctx) => {
      const po = (await ctx.db.query("purchaseOrders").collect())[0];
      await ctx.db.patch(po._id, { status: "delivered" });
      const inv = (await ctx.db.query("inventory").collect()).find((r) => r.productId === productId)!;
      await ctx.db.patch(inv._id, { reserved: 3 });
    });
    await expect(
      t.mutation(api.inventory.deleteProductPermanently, { token: adminToken, productId, confirmSku: "SKU-DEL-1" }),
    ).rejects.toThrow(/reserved/i);
    expect((await countFor(productId)).product).toBe(1);
  });
});
