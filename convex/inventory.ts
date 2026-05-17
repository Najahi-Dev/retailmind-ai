import { query } from "./_generated/server";
import { v } from "convex/values";

// Get all inventory with product + category details
export const getInventoryOverview = query({
  args: {},
  handler: async (ctx) => {
    const inventory = await ctx.db.query("inventory").collect();

    const result = await Promise.all(
      inventory.map(async (inv) => {
        const product = await ctx.db.get(inv.productId);
        if (!product) return null;

        const category = product.categoryId
          ? await ctx.db.get(product.categoryId)
          : null;

        const supplier = product.primarySupplierId
          ? await ctx.db.get(product.primarySupplierId)
          : null;

        const location = await ctx.db.get(inv.locationId);

        // Stock status logic
        let status: "critical" | "low" | "healthy" | "overstock";
        if (inv.onHand <= product.safetyStock) {
          status = "critical";
        } else if (inv.onHand <= product.reorderPoint) {
          status = "low";
        } else if (inv.onHand >= product.reorderPoint * 5) {
          status = "overstock";
        } else {
          status = "healthy";
        }

        return {
          inventoryId:  inv._id,
          productId:    product._id,
          sku:          product.sku,
          name:         product.name,
          category:     category?.name ?? "Uncategorized",
          supplier:     supplier?.name ?? "Unknown",
          location:     location?.name ?? "Unknown",
          unit:         product.unit,
          onHand:       inv.onHand,
          reserved:     inv.reserved,
          available:    inv.available,
          reorderPoint: product.reorderPoint,
          safetyStock:  product.safetyStock,
          costPrice:    product.costPrice,
          sellingPrice: product.sellingPrice,
          stockValue:   inv.onHand * product.costPrice,
          status,
          lastUpdated:  inv.lastUpdated,
        };
      })
    );

    return result.filter(Boolean);
  },
});

// Get inventory stats for KPI cards
export const getInventoryStats = query({
  args: {},
  handler: async (ctx) => {
    const inventory = await ctx.db.query("inventory").collect();
    const products  = await ctx.db.query("products").collect();

    let totalValue   = 0;
    let criticalCount = 0;
    let lowCount      = 0;
    let overstockCount = 0;
    let healthyCount  = 0;

    for (const inv of inventory) {
      const product = await ctx.db.get(inv.productId);
      if (!product) continue;

      totalValue += inv.onHand * product.costPrice;

      if (inv.onHand <= product.safetyStock) {
        criticalCount++;
      } else if (inv.onHand <= product.reorderPoint) {
        lowCount++;
      } else if (inv.onHand >= product.reorderPoint * 5) {
        overstockCount++;
      } else {
        healthyCount++;
      }
    }

    return {
      totalProducts:  products.length,
      totalValue:     Math.round(totalValue * 100) / 100,
      criticalCount,
      lowCount,
      overstockCount,
      healthyCount,
    };
  },
});

// Get single product inventory detail
export const getProductInventory = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const inv = await ctx.db
      .query("inventory")
      .withIndex("by_product", q => q.eq("productId", args.productId))
      .first();

    if (!inv) return null;

    const product  = await ctx.db.get(inv.productId);
    const category = product?.categoryId
      ? await ctx.db.get(product.categoryId)
      : null;
    const location = await ctx.db.get(inv.locationId);

    return { inv, product, category, location };
  },
});