/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
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
    adminToken = "admin-pricing-token";
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        userId: adminId,
        orgId,
        token: adminToken,
        expiresAt: Date.now() + 86400000,
        createdAt: Date.now(),
      });
    });

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
    staffToken = "staff-pricing-token";
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        userId: staffId,
        orgId,
        token: staffToken,
        expiresAt: Date.now() + 86400000,
        createdAt: Date.now(),
      });
    });

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
});
