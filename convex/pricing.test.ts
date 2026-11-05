/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { createTestSession } from "./lib/testAuth";
import { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");
const DAY = 86_400_000;

describe("Dynamic Pricing Engine & Guardrails", () => {
  let t: ReturnType<typeof convexTest>;
  let orgId: Id<"organizations">;
  let adminId: Id<"users">;
  let staffId: Id<"users">;
  let adminToken: string;
  let staffToken: string;
  let warehouseId: Id<"locations">;
  let categoryId: Id<"categories">;

  /** Record `unitsPerDay` sales for each of the last `days` days. */
  async function recordSales(productId: Id<"products">, unitsPerDay: number, days: number) {
    await t.run(async (ctx) => {
      const now = Date.now();
      for (let d = 0; d < days; d++) {
        await ctx.db.insert("stockMovements", {
          orgId,
          productId,
          locationId: warehouseId,
          type: "stock_out",
          quantity: unitsPerDay,
          createdAt: now - d * DAY - 3_600_000,
        });
      }
    });
  }

  async function makeProduct(opts: {
    sku: string;
    costPrice: number;
    sellingPrice: number;
    reorderPoint: number;
    safetyStock: number;
    initialQuantity: number;
  }) {
    return await t.mutation(api.inventory.createProduct, {
      token: adminToken,
      name: opts.sku,
      unit: "pcs",
      trackBatches: false,
      categoryId,
      initialLocationId: warehouseId,
      ...opts,
    });
  }

  async function scan() {
    return await t.mutation(api.pricing.generatePriceSuggestionsPublic, { token: adminToken });
  }

  async function suggestionFor(productId: Id<"products">) {
    const all = await t.query(api.pricing.getPriceSuggestions, { token: adminToken });
    return all.find((s) => s.productId === productId);
  }

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

  it("suggests an increase for critical stock that is actually selling, with priceChange as a percent", async () => {
    // onHand 5 <= safetyStock 10; selling 2/day → ~3 days of cover, stable demand.
    const productId = await makeProduct({
      sku: "SKU-HEADPHONES",
      costPrice: 5000,
      sellingPrice: 8000,
      reorderPoint: 20,
      safetyStock: 10,
      initialQuantity: 5,
    });
    await recordSales(productId, 2, 28);

    const res = await scan();
    expect(res.created).toBe(1);

    const s = await suggestionFor(productId);
    expect(s?.changeDirection).toBe("increase");
    expect(s?.suggestedPrice).toBe(8640); // +8% (critical, stable demand)
    expect(s?.priceChange).toBe(8); // percent, not LKR
    expect(s?.factors.demandTrend).toBe("Stable");
    expect(s?.factors.daysOfStock).toBe(3);
    expect(s?.confidence).toBeLessThan(0.92);
    expect(s?.status).toBe("pending");

    // Impact = 640 LKR × 5 units expected to sell (capped at stock on hand).
    const stats = await t.query(api.pricing.getPricingStats, { token: adminToken });
    expect(stats.totalPotentialProfit).toBe(3200);
  });

  it("does not mark up low or zero stock that has no sales", async () => {
    const lowNoSales = await makeProduct({
      sku: "SKU-LOW-NOSALES",
      costPrice: 100,
      sellingPrice: 200,
      reorderPoint: 20,
      safetyStock: 10,
      initialQuantity: 3,
    });
    const outOfStock = await makeProduct({
      sku: "SKU-OOS",
      costPrice: 100,
      sellingPrice: 200,
      reorderPoint: 20,
      safetyStock: 10,
      initialQuantity: 0,
    });
    await recordSales(outOfStock, 2, 28);

    await scan();
    expect(await suggestionFor(lowNoSales)).toBeUndefined();
    expect(await suggestionFor(outOfStock)).toBeUndefined();
  });

  it("suggests a markdown for unsold overstock", async () => {
    // 100 >= 3 × 20 and nothing sold in 30 days.
    const productId = await makeProduct({
      sku: "SKU-USB-CABLE",
      costPrice: 200,
      sellingPrice: 500,
      reorderPoint: 20,
      safetyStock: 5,
      initialQuantity: 100,
    });

    await scan();
    const s = await suggestionFor(productId);
    expect(s?.changeDirection).toBe("decrease");
    expect(s?.suggestedPrice).toBe(435); // −13%
    expect(s?.priceChange).toBe(-13);
    expect(s?.factors.demandTrend).toBe("No sales (30d)");
  });

  it("compares per-location stock, so healthy multi-location products are not 'overstock'", async () => {
    // 25 units in each of 3 locations, reorder point 20 → healthy everywhere.
    const productId = await makeProduct({
      sku: "SKU-MULTI",
      costPrice: 100,
      sellingPrice: 300,
      reorderPoint: 20,
      safetyStock: 5,
      initialQuantity: 25,
    });
    for (const name of ["Store A", "Store B"]) {
      const locationId = await t.mutation(api.inventory.addLocation, { token: adminToken, name, type: "store" });
      await t.run(async (ctx) => {
        await ctx.db.insert("inventory", {
          orgId,
          productId,
          locationId,
          onHand: 25,
          reserved: 0,
          available: 25,
          lastUpdated: Date.now(),
        });
      });
    }
    await recordSales(productId, 3, 28);

    await scan();
    expect(await suggestionFor(productId)).toBeUndefined();
  });

  it("does not treat a reorder point of 0 as permanent overstock", async () => {
    const productId = await makeProduct({
      sku: "SKU-NO-RP",
      costPrice: 100,
      sellingPrice: 300,
      reorderPoint: 0,
      safetyStock: 0,
      initialQuantity: 40,
    });
    await recordSales(productId, 2, 28); // ~21 days of cover — fine

    await scan();
    expect(await suggestionFor(productId)).toBeUndefined();
  });

  it("never turns a markdown into an increase and respects the cost + 5% floor", async () => {
    // Already priced at cost → floor (1050) is above the current price.
    const atCost = await makeProduct({
      sku: "SKU-AT-COST",
      costPrice: 1000,
      sellingPrice: 1000,
      reorderPoint: 10,
      safetyStock: 2,
      initialQuantity: 100,
    });
    // Thin margin → markdown capped at the floor: 450 × 1.05 = 472.5 → 473.
    const thin = await makeProduct({
      sku: "SKU-THIN",
      costPrice: 450,
      sellingPrice: 500,
      reorderPoint: 10,
      safetyStock: 2,
      initialQuantity: 100,
    });

    await scan();
    expect(await suggestionFor(atCost)).toBeUndefined();
    const s = await suggestionFor(thin);
    expect(s?.changeDirection).toBe("decrease");
    expect(s?.suggestedPrice).toBe(473);
    expect(s?.suggestedPrice).toBeLessThan(500);
  });

  it("refreshes stale pending suggestions and refuses to approve against an outdated price", async () => {
    const productId = await makeProduct({
      sku: "SKU-STALE",
      costPrice: 5000,
      sellingPrice: 8000,
      reorderPoint: 20,
      safetyStock: 10,
      initialQuantity: 5,
    });
    await recordSales(productId, 2, 28);
    await scan();
    const before = await suggestionFor(productId);
    expect(before?.currentPrice).toBe(8000);

    // Price edited after the suggestion was created.
    await t.run(async (ctx) => ctx.db.patch(productId, { sellingPrice: 9000 }));

    await expect(
      t.mutation(api.pricing.approvePriceSuggestion, { token: adminToken, suggestionId: before!._id }),
    ).rejects.toThrow(/changed since this suggestion/i);

    const res = await scan();
    expect(res.created).toBe(0);
    expect(res.updated).toBe(1);
    const after = await suggestionFor(productId);
    expect(after?._id).toBe(before?._id);
    expect(after?.currentPrice).toBe(9000);
    expect(after?.suggestedPrice).toBe(9720);

    // Stock replenished → suggestion no longer justified → removed.
    await t.run(async (ctx) => {
      const inv = (await ctx.db.query("inventory").collect()).find((i) => i.productId === productId);
      await ctx.db.patch(inv!._id, { onHand: 40, available: 40 });
    });
    const res2 = await scan();
    expect(res2.removed).toBe(1);
    expect(await suggestionFor(productId)).toBeUndefined();
  });

  it("requires admin/manager to run a price scan", async () => {
    await expect(
      t.mutation(api.pricing.generatePriceSuggestionsPublic, { token: staffToken }),
    ).rejects.toThrow(/Access denied/i);
  });

  it("approves price suggestion, updating product selling price and auditing status", async () => {
    const productId = await makeProduct({
      sku: "SKU-POWER-BANK",
      costPrice: 3000,
      sellingPrice: 4500,
      reorderPoint: 30,
      safetyStock: 10,
      initialQuantity: 5,
    });
    await recordSales(productId, 2, 28);
    await scan();
    const suggestion = await suggestionFor(productId);
    expect(suggestion).toBeDefined();

    // Staff role must be denied approval
    await expect(
      t.mutation(api.pricing.approvePriceSuggestion, {
        token: staffToken,
        suggestionId: suggestion!._id,
      }),
    ).rejects.toThrow(/Access denied: Required role in \[admin, manager\]/i);

    await t.mutation(api.pricing.approvePriceSuggestion, {
      token: adminToken,
      suggestionId: suggestion!._id,
    });

    // 4500 × 1.08 = 4860
    const detail = await t.query(api.inventory.getProductDetail, { token: adminToken, productId });
    expect(detail?.product.sellingPrice).toBe(4860);
  });

  it("rejects price suggestion, preserving original product selling price", async () => {
    const productId = await makeProduct({
      sku: "SKU-BLUETOOTH-SPEAKER",
      costPrice: 2000,
      sellingPrice: 3500,
      reorderPoint: 25,
      safetyStock: 8,
      initialQuantity: 4,
    });
    await recordSales(productId, 2, 28);
    await scan();
    const suggestion = await suggestionFor(productId);
    expect(suggestion).toBeDefined();

    await t.mutation(api.pricing.rejectPriceSuggestion, {
      token: adminToken,
      suggestionId: suggestion!._id,
      reason: "Contractual price guarantee with distributor",
    });

    const detail = await t.query(api.inventory.getProductDetail, { token: adminToken, productId });
    expect(detail?.product.sellingPrice).toBe(3500);

    const updated = await suggestionFor(productId);
    expect(updated?.status).toBe("rejected");

    // Rejection cooldown: an immediate re-scan must not re-suggest it.
    const res = await scan();
    expect(res.created).toBe(0);
  });

  it("prevents duplicate price suggestions for the same product on repeated cron runs and deduplicates views", async () => {
    const productId = await makeProduct({
      sku: "SKU-SMARTPHONE",
      costPrice: 80000,
      sellingPrice: 120000,
      reorderPoint: 20,
      safetyStock: 10,
      initialQuantity: 4,
    });
    await recordSales(productId, 2, 28);

    const firstRun = await scan();
    expect(firstRun.created).toBe(1);

    // Second run refreshes rather than duplicating.
    const secondRun = await scan();
    expect(secondRun.created).toBe(0);

    // Simulate older duplicates left behind by past cron runs.
    await t.run(async (ctx) => {
      for (const daysAgo of [2, 1]) {
        await ctx.db.insert("priceSuggestions", {
          orgId,
          productId,
          currentPrice: 120000,
          suggestedPrice: 138000,
          priceChange: 15,
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
          createdAt: Date.now() - daysAgo * DAY,
        });
      }
    });

    const pending = await t.query(api.pricing.getPriceSuggestions, { token: adminToken, status: "pending" });
    expect(pending.filter((s) => s.productId === productId).length).toBe(1);

    const stats = await t.query(api.pricing.getPricingStats, { token: adminToken });
    expect(stats.pending).toBe(1);

    const cleanupRes = await t.mutation(api.pricing.cleanupDuplicatePriceSuggestions, { token: adminToken });
    expect(cleanupRes.cleaned).toBe(2);

    const active = (await t.query(api.pricing.getPriceSuggestions, { token: adminToken, status: "pending" })).find(
      (s) => s.productId === productId,
    );
    expect(active).toBeDefined();

    await t.mutation(api.pricing.approvePriceSuggestion, { token: adminToken, suggestionId: active!._id });

    // Approval cooldown active → no new suggestion.
    const thirdRun = await scan();
    expect(thirdRun.created).toBe(0);
  });
});
