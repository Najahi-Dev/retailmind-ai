/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { createTestSession } from "./lib/testAuth";
import { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");
const DAY = 86_400_000;

describe("getProductDemandInsights", () => {
  let t: ReturnType<typeof convexTest>;
  let orgId: Id<"organizations">;
  let token: string;
  let locationId: Id<"locations">;

  beforeEach(async () => {
    t = convexTest(schema, modules);
    orgId = await t.run((ctx) =>
      ctx.db.insert("organizations", {
        name: "Forecast Org",
        slug: "forecast-org",
        inviteCode: "FC123",
        plan: "growth",
        isActive: true,
        createdAt: Date.now(),
      }),
    );
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "fc@test.com",
        name: "FC Admin",
        role: "admin",
        orgId,
        isActive: true,
        createdAt: Date.now(),
      }),
    );
    token = await createTestSession(t, userId);
    locationId = await t.mutation(api.inventory.addLocation, { token, name: "WH", type: "warehouse" });
  });

  async function product(qty: number) {
    return await t.mutation(api.inventory.createProduct, {
      token,
      sku: `SKU-${qty}-${Math.random()}`,
      name: "Forecast Product",
      unit: "pcs",
      costPrice: 100,
      sellingPrice: 150,
      reorderPoint: 20,
      safetyStock: 10,
      trackBatches: false,
      initialLocationId: locationId,
      initialQuantity: qty,
    });
  }

  async function sales(productId: Id<"products">, perDay: number, days: number) {
    await t.run(async (ctx) => {
      const now = Date.now();
      for (let d = 1; d <= days; d++) {
        await ctx.db.insert("stockMovements", {
          orgId,
          productId,
          locationId,
          type: "stock_out",
          quantity: perDay,
          createdAt: now - d * DAY,
        });
      }
    });
  }

  it("builds a baseline forecast from sales and projects the stock-out", async () => {
    const productId = await product(50);
    await sales(productId, 2, 40); // steady 2/day

    const r = await t.query(api.forecasting.getProductDemandInsights, { token, productId });
    expect(r.source).toBe("baseline");
    expect(r.history).toHaveLength(60);
    expect(r.forecast).toHaveLength(30);
    expect(r.stats.sold30).toBe(60); // last 30 completed days × 2
    expect(r.stats.forecast7).toBeCloseTo(14, 0);
    expect(r.stats.trendPct).toBe(0);
    // 50 available at ~2/day → runs out in ~25 days; reorder point (20) hit ~day 15.
    expect(r.stats.daysOfCover).toBeGreaterThanOrEqual(23);
    expect(r.stats.daysOfCover).toBeLessThanOrEqual(26);
    expect(r.stats.stockoutDate).not.toBeNull();
    expect(r.stats.reorderByDate).not.toBeNull();
    expect(r.stats.suggestedOrderQty).toBeGreaterThan(0);
  });

  it("prefers the stored ML forecast when one exists", async () => {
    const productId = await product(500);
    await sales(productId, 2, 20);
    await t.run(async (ctx) => {
      const today = Math.floor(Date.now() / DAY) * DAY;
      for (let d = 0; d < 30; d++) {
        await ctx.db.insert("forecasts", {
          orgId,
          productId,
          forecastDate: today + d * DAY,
          predictedDemand: 5,
          upperBound: 7,
          lowerBound: 3,
          confidenceScore: 0.82,
          modelUsed: "prophet",
          generatedAt: Date.now(),
        });
      }
    });

    const r = await t.query(api.forecasting.getProductDemandInsights, { token, productId });
    expect(r.source).toBe("model");
    expect(r.modelUsed).toBe("prophet");
    expect(r.stats.forecast30).toBe(150);
    expect(r.stats.stockoutDate).toBeNull(); // 500 > 150
    expect(r.stats.suggestedOrderQty).toBe(0);
  });

  it("returns source 'none' when nothing has sold", async () => {
    const productId = await product(30);
    const r = await t.query(api.forecasting.getProductDemandInsights, { token, productId });
    expect(r.source).toBe("none");
    expect(r.forecast).toHaveLength(0);
  });

  it("blocks access to another organization's product", async () => {
    const productId = await product(30);
    const otherOrg = await t.run((ctx) =>
      ctx.db.insert("organizations", {
        name: "Other",
        slug: "other",
        inviteCode: "OTH1",
        plan: "growth",
        isActive: true,
        createdAt: Date.now(),
      }),
    );
    const otherUser = await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "o@test.com",
        name: "O",
        role: "admin",
        orgId: otherOrg,
        isActive: true,
        createdAt: Date.now(),
      }),
    );
    const otherToken = await createTestSession(t, otherUser);
    await expect(
      t.query(api.forecasting.getProductDemandInsights, { token: otherToken, productId }),
    ).rejects.toThrow();
  });
});
