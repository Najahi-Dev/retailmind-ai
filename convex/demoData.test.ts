/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

describe("Demo dataset", () => {
  it("wipes business data, keeps accounts, and seeds a consistent Sri Lankan supermarket", async () => {
    const t = convexTest(schema, modules);
    const { orgId, supplierUserId } = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        name: "RMA Main", slug: "rma-main", inviteCode: "X", plan: "growth", planTier: "ENTERPRISE",
        subscriptionStatus: "ACTIVE", isActive: true, createdAt: Date.now(),
      });
      await ctx.db.insert("users", { email: "admin@rma.lk", name: "Admin", role: "admin", orgId, isActive: true, createdAt: Date.now() });
      const supplierUserId = await ctx.db.insert("users", {
        email: "dairy.rep@example.com", name: "Dairy Rep", role: "supplier", orgId, isActive: true, createdAt: Date.now(),
      });
      // junk that must be wiped
      await ctx.db.insert("categories", { orgId, name: "Old junk", createdAt: Date.now() });
      return { orgId, supplierUserId };
    });

    const summary = await t.action(internal.demoData.resetAndSeed, { orgId, skipForecasts: true });
    expect(summary.catalog).toEqual({ locations: 3, categories: 12, suppliers: 12, products: 120 });

    const counts = await t.run(async (ctx) => ({
      users: (await ctx.db.query("users").collect()).length,
      categories: (await ctx.db.query("categories").collect()).map((c) => c.name),
      products: await ctx.db.query("products").collect(),
      inventory: await ctx.db.query("inventory").collect(),
      movements: (await ctx.db.query("stockMovements").collect()).length,
      pos: await ctx.db.query("purchaseOrders").collect(),
      payments: (await ctx.db.query("poPayments").collect()).length,
      alerts: (await ctx.db.query("alerts").collect()).length,
      reorders: await ctx.db.query("reorderSuggestions").collect(),
      prices: (await ctx.db.query("priceSuggestions").collect()).length,
      supplierUser: await ctx.db.get(supplierUserId),
    }));

    expect(counts.users).toBe(2); // accounts kept
    expect(counts.categories).not.toContain("Old junk");
    expect(counts.products).toHaveLength(120);
    expect(new Set(counts.products.map((p) => p.sku)).size).toBe(120);
    expect(counts.products.every((p) => p.sellingPrice > p.costPrice && /^479\d{10}$/.test(p.barcode!))).toBe(true);
    expect(counts.inventory).toHaveLength(360);
    expect(counts.movements).toBeGreaterThan(8000);
    expect(counts.movements).toBeLessThan(12500); // stays well inside per-query read limits
    expect(new Set(counts.pos.map((p) => p.status))).toEqual(
      new Set(["draft", "sent", "confirmed", "shipped", "delivered", "cancelled"]),
    );
    expect(counts.payments).toBeGreaterThan(0);
    expect(counts.alerts).toBeGreaterThan(10);
    expect(counts.reorders.length).toBeGreaterThan(5);
    expect(counts.reorders.some((r: any) => r.urgency === "critical")).toBe(true);
    expect(counts.prices).toBeGreaterThan(0);
    expect(counts.supplierUser?.supplierId).toBeDefined();
    console.log("demo summary", JSON.stringify({ ...summary, reorders: counts.reorders.length, prices: counts.prices, movements: counts.movements }));
  }, 120_000);
});
