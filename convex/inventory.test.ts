/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

describe("Inventory Management & Stock Lifecycle", () => {
  let t: ReturnType<typeof convexTest>;
  let orgId: Id<"organizations">;
  let adminId: Id<"users">;
  let token: string;
  let warehouseId: Id<"locations">;
  let storeLocationId: Id<"locations">;
  let categoryId: Id<"categories">;

  beforeEach(async () => {
    t = convexTest(schema, modules);

    // Seed organization
    orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Acme Supermarket",
        slug: "acme-supermarket",
        inviteCode: "ACME2026",
        plan: "growth",
        isActive: true,
        createdAt: Date.now(),
      });
    });

    // Seed admin user
    adminId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "admin@acme.com",
        name: "Admin John",
        role: "admin",
        orgId,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    token = "session-token-admin";
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        userId: adminId,
        orgId,
        token,
        expiresAt: Date.now() + 86400000,
        createdAt: Date.now(),
      });
    });

    // Seed locations
    warehouseId = await t.mutation(api.inventory.addLocation, {
      token,
      name: "Central Warehouse",
      type: "warehouse",
      address: "123 Main St",
    });

    storeLocationId = await t.mutation(api.inventory.addLocation, {
      token,
      name: "Downtown Store",
      type: "store",
      address: "456 Market St",
    });

    // Seed category
    categoryId = await t.mutation(api.inventory.addCategory, {
      token,
      name: "Dairy & Frozen",
    });
  });

  it("creates a product and checks for duplicate SKU rejection", async () => {
    const productId = await t.mutation(api.inventory.createProduct, {
      token,
      sku: "SKU-MILK-1L",
      name: "Fresh Whole Milk 1L",
      unit: "litre",
      costPrice: 200,
      sellingPrice: 260,
      reorderPoint: 50,
      safetyStock: 20,
      trackBatches: false,
      categoryId,
      initialLocationId: warehouseId,
      initialQuantity: 100,
    });

    expect(productId).toBeDefined();

    // Verify product exists
    const detail = await t.query(api.inventory.getProductDetail, {
      token,
      productId,
    });
    expect(detail).toBeDefined();
    expect(detail?.product.sku).toBe("SKU-MILK-1L");
    expect(detail?.product.name).toBe("Fresh Whole Milk 1L");
    expect(detail?.inventory?.onHand).toBe(100);

    // Attempt to create duplicate SKU in same org should FAIL
    await expect(
      t.mutation(api.inventory.createProduct, {
        token,
        sku: "SKU-MILK-1L",
        name: "Duplicate Milk",
        unit: "litre",
        costPrice: 200,
        sellingPrice: 260,
        reorderPoint: 50,
        safetyStock: 20,
        trackBatches: false,
      })
    ).rejects.toThrow(/already exists in your workspace/i);
  });

  it("records stock in and increments available stock and movements", async () => {
    const productId = await t.mutation(api.inventory.createProduct, {
      token,
      sku: "SKU-YOGURT-100G",
      name: "Strawberry Yogurt 100g",
      unit: "pcs",
      costPrice: 80,
      sellingPrice: 120,
      reorderPoint: 30,
      safetyStock: 10,
      trackBatches: false,
    });

    // Stock in 50 units
    const res = await t.mutation(api.inventory.recordStockIn, {
      token,
      productId,
      locationId: warehouseId,
      quantity: 50,
      reason: "Supplier Delivery PO-101",
    });
    expect(res.success).toBe(true);

    const detail = await t.query(api.inventory.getProductDetail, {
      token,
      productId,
    });
    expect(detail?.inventory?.onHand).toBe(50);
    expect(detail?.inventory?.available).toBe(50);

    // Verify stock movement history
    const history = await t.query(api.inventory.getStockHistory, {
      token,
      productId,
    });
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].type).toBe("stock_in");
    expect(history[0].quantity).toBe(50);

    // Negative or zero quantity should be rejected
    await expect(
      t.mutation(api.inventory.recordStockIn, {
        token,
        productId,
        locationId: warehouseId,
        quantity: -5,
      })
    ).rejects.toThrow(/Quantity must be positive/i);
  });

  it("records stock out and enforces insufficient stock protection", async () => {
    const productId = await t.mutation(api.inventory.createProduct, {
      token,
      sku: "SKU-CHEESE-200G",
      name: "Cheddar Cheese 200g",
      unit: "kg",
      costPrice: 350,
      sellingPrice: 480,
      reorderPoint: 40,
      safetyStock: 15,
      trackBatches: false,
      initialLocationId: warehouseId,
      initialQuantity: 25,
    });

    // Stock out valid quantity (10 units)
    await t.mutation(api.inventory.recordStockOut, {
      token,
      productId,
      locationId: warehouseId,
      quantity: 10,
      reason: "Store replenishment",
    });

    const detailAfterOut = await t.query(api.inventory.getProductDetail, {
      token,
      productId,
    });
    expect(detailAfterOut?.inventory?.onHand).toBe(15);
    expect(detailAfterOut?.inventory?.available).toBe(15);

    // Attempt to stock out more than available (20 units > 15 available) -> MUST FAIL
    await expect(
      t.mutation(api.inventory.recordStockOut, {
        token,
        productId,
        locationId: warehouseId,
        quantity: 20,
        reason: "Excessive dispatch",
      })
    ).rejects.toThrow(/Insufficient available stock/i);
  });

  it("handles physical stock adjustments and rejects negative counts", async () => {
    const productId = await t.mutation(api.inventory.createProduct, {
      token,
      sku: "SKU-BUTTER-250G",
      name: "Salted Butter 250g",
      unit: "pcs",
      costPrice: 400,
      sellingPrice: 520,
      reorderPoint: 20,
      safetyStock: 5,
      trackBatches: false,
      initialLocationId: warehouseId,
      initialQuantity: 30,
    });

    // Stock count revealed 28 instead of 30 (-2 adjustment)
    await t.mutation(api.inventory.recordStockAdjustment, {
      token,
      productId,
      locationId: warehouseId,
      newOnHand: 28,
      reason: "Cycle count discrepancy",
    });

    const detail = await t.query(api.inventory.getProductDetail, {
      token,
      productId,
    });
    expect(detail?.inventory?.onHand).toBe(28);

    // Negative targetOnHand MUST be rejected
    await expect(
      t.mutation(api.inventory.recordStockAdjustment, {
        token,
        productId,
        locationId: warehouseId,
        newOnHand: -5,
      })
    ).rejects.toThrow(/New stock cannot be negative/i);
  });

  it("transfers stock between locations transactionally", async () => {
    const productId = await t.mutation(api.inventory.createProduct, {
      token,
      sku: "SKU-ICE-CREAM",
      name: "Vanilla Ice Cream 1L",
      unit: "box",
      costPrice: 500,
      sellingPrice: 700,
      reorderPoint: 30,
      safetyStock: 10,
      trackBatches: false,
      initialLocationId: warehouseId,
      initialQuantity: 50,
    });

    // Transfer 20 from Warehouse to Store
    await t.mutation(api.inventory.transferStockBetweenLocations, {
      token,
      productId,
      fromLocationId: warehouseId,
      toLocationId: storeLocationId,
      quantity: 20,
      reason: "Branch transfer",
    });

    // Verify inventory overview across locations
    const overview = await t.query(api.inventory.getInventoryOverview, {
      token,
    });

    const warehouseRecord = overview.find(
      (r) => r.productId === productId && r.location === "Central Warehouse"
    );
    const storeRecord = overview.find(
      (r) => r.productId === productId && r.location === "Downtown Store"
    );

    expect(warehouseRecord?.onHand).toBe(30);
    expect(storeRecord?.onHand).toBe(20);

    // Attempting to transfer to same location must fail
    await expect(
      t.mutation(api.inventory.transferStockBetweenLocations, {
        token,
        productId,
        fromLocationId: warehouseId,
        toLocationId: warehouseId,
        quantity: 5,
      })
    ).rejects.toThrow(/Source and target locations must be different/i);

    // Attempting to transfer more than available must fail
    await expect(
      t.mutation(api.inventory.transferStockBetweenLocations, {
        token,
        productId,
        fromLocationId: warehouseId,
        toLocationId: storeLocationId,
        quantity: 100,
      })
    ).rejects.toThrow(/Insufficient stock at source location/i);
  });

  it("calculates accurate inventory stats, valuation, and status categories", async () => {
    // 1. Critical item: onHand (5) <= safetyStock (10)
    await t.mutation(api.inventory.createProduct, {
      token,
      sku: "SKU-CRITICAL-ITEM",
      name: "Critical Stock Item",
      unit: "pcs",
      costPrice: 100,
      sellingPrice: 150,
      reorderPoint: 30,
      safetyStock: 10,
      trackBatches: false,
      initialLocationId: warehouseId,
      initialQuantity: 5,
    });

    // 2. Low stock item: safetyStock (5) < onHand (15) <= reorderPoint (20)
    await t.mutation(api.inventory.createProduct, {
      token,
      sku: "SKU-LOW-ITEM",
      name: "Low Stock Item",
      unit: "pcs",
      costPrice: 50,
      sellingPrice: 80,
      reorderPoint: 20,
      safetyStock: 5,
      trackBatches: false,
      initialLocationId: warehouseId,
      initialQuantity: 15,
    });

    // 3. Healthy item: reorderPoint (20) < onHand (40) < reorderPoint * 3 (60)
    await t.mutation(api.inventory.createProduct, {
      token,
      sku: "SKU-HEALTHY-ITEM",
      name: "Healthy Stock Item",
      unit: "pcs",
      costPrice: 200,
      sellingPrice: 300,
      reorderPoint: 20,
      safetyStock: 5,
      trackBatches: false,
      initialLocationId: warehouseId,
      initialQuantity: 40,
    });

    // 4. Overstock item: onHand (100) >= reorderPoint * 3 (60)
    await t.mutation(api.inventory.createProduct, {
      token,
      sku: "SKU-OVERSTOCK-ITEM",
      name: "Overstock Item",
      unit: "pcs",
      costPrice: 10,
      sellingPrice: 20,
      reorderPoint: 20,
      safetyStock: 5,
      trackBatches: false,
      initialLocationId: warehouseId,
      initialQuantity: 100,
    });

    const stats = await t.query(api.inventory.getInventoryStats, { token });

    expect(stats.totalProducts).toBe(4);
    expect(stats.criticalCount).toBe(1);
    expect(stats.lowCount).toBe(1);
    expect(stats.healthyCount).toBe(1);
    expect(stats.overstockCount).toBe(1);

    // Total valuation: 5*100 + 15*50 + 40*200 + 100*10 = 500 + 750 + 8000 + 1000 = 10250
    expect(stats.totalValue).toBe(10250);
  });
});
