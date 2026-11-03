/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { createTestSession } from "./lib/testAuth";
import { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

describe("Dynamic Pricing Engine & Guardrails", () => {
  let t: ReturnType<typeof convexTest>;
  let orgId: Id<"organizations">;
  let adminId: Id<"users">;
  let staffId: Id<"users">;
  let adminToken: string;
  let staffToken: string;
  let warehouseId: Id<"locations">;
  let categoryId: Id<"categories">;

  beforeEach(async () => {
    t = convexTest(schema, modules);

    orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Pricing Test Org",
        slug: "pricing-test-org",
        inviteCode: "PRICE123",
        plan: "growth",
        isActive: true,
        createdAt: Date.now(),
      });
    });

    adminId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "pricingadmin@test.com",
        name: "Pricing Admin",
        role: "admin",
        orgId,
        isActive: true,
        createdAt: Date.now(),
      });
    });
    adminToken = await createTestSession(t, adminId);

    staffId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "pricingstaff@test.com",
        name: "Pricing Staff",
        role: "staff",
        orgId,
        isActive: true,
        createdAt: Date.now(),
      });
    });
    staffToken = await createTestSession(t, staffId);

    warehouseId = await t.mutation(api.inventory.addLocation, {
      token: adminToken,
      name: "Pricing Warehouse",
      type: "warehouse",
    });

    categoryId = await t.mutation(api.inventory.addCategory, {
      token: adminToken,
      name: "Electronics",
    });
  });

  it("suggests price increase for critical low stock items", async () => {
    // Critical stock: onHand (5) <= safetyStock (10)
    const productId = await t.mutation(api.inventory.createProduct, {
      token: adminToken,
      sku: "SKU-HEADPHONES",
      name: "Wireless Headphones",
      unit: "pcs",
      costPrice: 5000,
      sellingPrice: 8000,
      reorderPoint: 20,
      safetyStock: 10,
      trackBatches: false,
      categoryId,
      initialLocationId: warehouseId,
      initialQuantity: 5,
    });

    const res = await t.mutation(api.pricing.generatePriceSuggestionsPublic, {
      token: adminToken,
    });
    expect(res.created).toBeGreaterThanOrEqual(1);

    const suggestions = await t.query(api.pricing.getPriceSuggestions, {
      token: adminToken,
    });
    const hpSuggestion = suggestions.find((s) => s.productId === productId);

    expect(hpSuggestion).toBeDefined();
    expect(hpSuggestion?.changeDirection).toBe("increase");
    // 8000 * 1.15 = 9200
    expect(hpSuggestion?.suggestedPrice).toBe(9200);
    expect(hpSuggestion?.priceChange).toBe(1200);
    expect(hpSuggestion?.status).toBe("pending");
  });

  it("suggests price decrease for overstocked inventory", async () => {
    // Overstock: onHand (100) >= reorderPoint * 3 (20 * 3 = 60)
    const productId = await t.mutation(api.inventory.createProduct, {
      token: adminToken,
      sku: "SKU-USB-CABLE",
      name: "USB-C Fast Cable",
      unit: "pcs",
      costPrice: 200,
      sellingPrice: 500,
      reorderPoint: 20,
      safetyStock: 5,
      trackBatches: false,
      categoryId,
      initialLocationId: warehouseId,
      initialQuantity: 100,
    });

    await t.mutation(api.pricing.generatePriceSuggestionsPublic, {
      token: adminToken,
    });

    const suggestions = await t.query(api.pricing.getPriceSuggestions, {
      token: adminToken,
    });
    const cableSuggestion = suggestions.find((s) => s.productId === productId);

    expect(cableSuggestion).toBeDefined();
    expect(cableSuggestion?.changeDirection).toBe("decrease");
    // 500 * 0.9 = 450
    expect(cableSuggestion?.suggestedPrice).toBe(450);
    expect(cableSuggestion?.priceChange).toBe(-50);
    expect(cableSuggestion?.status).toBe("pending");
  });

  it("approves price suggestion, updating product selling price and auditing status", async () => {
    const productId = await t.mutation(api.inventory.createProduct, {
      token: adminToken,
      sku: "SKU-POWER-BANK",
      name: "20000mAh Power Bank",
      unit: "pcs",
      costPrice: 3000,
      sellingPrice: 4500,
      reorderPoint: 30,
      safetyStock: 10,
      trackBatches: false,
      categoryId,
      initialLocationId: warehouseId,
      initialQuantity: 5,
    });

    await t.mutation(api.pricing.generatePriceSuggestionsPublic, {
      token: adminToken,
    });

    const suggestions = await t.query(api.pricing.getPriceSuggestions, {
      token: adminToken,
    });
    const suggestion = suggestions.find((s) => s.productId === productId);
    expect(suggestion).toBeDefined();

    // Staff role must be denied approval
    await expect(
      t.mutation(api.pricing.approvePriceSuggestion, {
        token: staffToken,
        suggestionId: suggestion!._id,
      })
    ).rejects.toThrow(/Access denied: Required role in \[admin, manager\]/i);

    // Admin approves
    await t.mutation(api.pricing.approvePriceSuggestion, {
      token: adminToken,
      suggestionId: suggestion!._id,
    });

    // Verify product price updated: 4500 * 1.15 = 5175
    const detail = await t.query(api.inventory.getProductDetail, {
      token: adminToken,
      productId,
    });
    expect(detail?.product.sellingPrice).toBe(5175);
  });

  it("rejects price suggestion, preserving original product selling price", async () => {
    const productId = await t.mutation(api.inventory.createProduct, {
      token: adminToken,
      sku: "SKU-BLUETOOTH-SPEAKER",
      name: "Mini Bluetooth Speaker",
      unit: "pcs",
      costPrice: 2000,
      sellingPrice: 3500,
      reorderPoint: 25,
      safetyStock: 8,
      trackBatches: false,
      categoryId,
      initialLocationId: warehouseId,
      initialQuantity: 4,
    });

    await t.mutation(api.pricing.generatePriceSuggestionsPublic, {
      token: adminToken,
    });

    const suggestions = await t.query(api.pricing.getPriceSuggestions, {
      token: adminToken,
    });
    const suggestion = suggestions.find((s) => s.productId === productId);
    expect(suggestion).toBeDefined();

    // Admin rejects
    await t.mutation(api.pricing.rejectPriceSuggestion, {
      token: adminToken,
      suggestionId: suggestion!._id,
      reason: "Contractual price guarantee with distributor",
    });

    // Verify product selling price is unchanged (still 3500)
    const detail = await t.query(api.inventory.getProductDetail, {
      token: adminToken,
      productId,
    });
    expect(detail?.product.sellingPrice).toBe(3500);

    // Verify suggestion status is rejected
    const updatedSuggestions = await t.query(api.pricing.getPriceSuggestions, {
      token: adminToken,
    });
    const updated = updatedSuggestions.find((s) => s._id === suggestion!._id);
    expect(updated?.status).toBe("rejected");
  });

  it("prevents duplicate price suggestions for the same product on repeated cron runs and deduplicates views", async () => {
    // 1. Create a product with critical low stock
    const productId = await t.mutation(api.inventory.createProduct, {
      token: adminToken,
      sku: "SKU-SMARTPHONE",
      name: "Flagship Smartphone",
      unit: "pcs",
      costPrice: 80000,
      sellingPrice: 120000,
      reorderPoint: 20,
      safetyStock: 10,
      trackBatches: false,
      categoryId,
      initialLocationId: warehouseId,
      initialQuantity: 4,
    });

    // 2. First generation run: creates 1 suggestion
    const firstRun = await t.mutation(api.pricing.generatePriceSuggestionsPublic, {
      token: adminToken,
    });
    expect(firstRun.created).toBe(1);

    // 3. Second generation run: should skip because pending suggestion already exists
    const secondRun = await t.mutation(api.pricing.generatePriceSuggestionsPublic, {
      token: adminToken,
    });
    expect(secondRun.created).toBe(0);

    // 4. Manually insert older duplicate suggestions (simulating past nightly crons that created duplicates)
    await t.run(async (ctx) => {
      // Duplicate 1
      await ctx.db.insert("priceSuggestions", {
        orgId,
        productId,
        currentPrice: 120000,
        suggestedPrice: 138000,
        priceChange: 18000,
        changeDirection: "increase",
        reason: "Low stock protection markup",
        confidence: 0.92,
        factors: {
          stockLevel: "4 units",
          demandTrend: "High Demand",
          seasonality: "normal",
          daysOfStock: 1,
        },
        status: "pending",
        createdAt: Date.now() - 2 * 86400000,
      });
      // Duplicate 2
      await ctx.db.insert("priceSuggestions", {
        orgId,
        productId,
        currentPrice: 120000,
        suggestedPrice: 138000,
        priceChange: 18000,
        changeDirection: "increase",
        reason: "Low stock protection markup",
        confidence: 0.92,
        factors: {
          stockLevel: "4 units",
          demandTrend: "High Demand",
          seasonality: "normal",
          daysOfStock: 1,
        },
        status: "pending",
        createdAt: Date.now() - 1 * 86400000,
      });
    });

    // 5. Query suggestions: must return only 1 deduplicated card for this product
    const suggestions = await t.query(api.pricing.getPriceSuggestions, {
      token: adminToken,
      status: "pending",
    });
    const phoneSuggestions = suggestions.filter((s) => s.productId === productId);
    expect(phoneSuggestions.length).toBe(1);

    // 6. Query stats: pending count must reflect unique products (1), not 3
    const stats = await t.query(api.pricing.getPricingStats, {
      token: adminToken,
    });
    expect(stats.pending).toBe(1);

    // 7. Cleanup mutation should remove the 2 older duplicates from DB
    const cleanupRes = await t.mutation(api.pricing.cleanupDuplicatePriceSuggestions, {
      token: adminToken,
    });
    expect(cleanupRes.cleaned).toBe(2);

    // 8. Re-query the active suggestion and approve it
    const activeSuggestions = await t.query(api.pricing.getPriceSuggestions, {
      token: adminToken,
      status: "pending",
    });
    const activePhone = activeSuggestions.find((s) => s.productId === productId);
    expect(activePhone).toBeDefined();

    await t.mutation(api.pricing.approvePriceSuggestion, {
      token: adminToken,
      suggestionId: activePhone!._id,
    });

    // 9. Re-run generator while recent approved cooldown is active -> should NOT create new suggestion
    const thirdRun = await t.mutation(api.pricing.generatePriceSuggestionsPublic, {
      token: adminToken,
    });
    expect(thirdRun.created).toBe(0);
  });
});
