import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ── Generate price suggestions nightly ───────
export const generatePriceSuggestions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const inventory = await ctx.db.query("inventory").collect();
    const now       = new Date();
    let   created   = 0;

    for (const inv of inventory) {
      const product = await ctx.db.get(inv.productId);
      if (!product || !product.isActive) continue;

      // Get last 30 days movements for avg daily sales
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const movements = await ctx.db
        .query("stockMovements")
        .withIndex("by_product_date", q =>
          q.eq("productId", inv.productId)
        )
        .filter(q =>
          q.and(
            q.eq(q.field("type"), "stock_out"),
            q.gte(q.field("createdAt"), thirtyDaysAgo)
          )
        )
        .collect();

      const totalOut     = movements.reduce(
        (sum, m) => sum + Math.abs(m.quantity), 0
      );
      const avgDailySales = totalOut / 30;

      // Get latest forecast
      const forecast = await ctx.db
        .query("forecasts")
        .withIndex("by_product", q =>
          q.eq("productId", inv.productId)
        )
        .order("desc")
        .first();

      // Call Python pricing API
      try {
        const response = await fetch(
          `${process.env.AI_SERVICE_URL}/price`,
          {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              product_id:      product._id,
              current_price:   product.sellingPrice,
              cost_price:      product.costPrice,
              on_hand:         inv.onHand,
              reorder_point:   product.reorderPoint,
              safety_stock:    product.safetyStock,
              avg_daily_sales: avgDailySales,
              forecast_demand: forecast?.predictedDemand ?? avgDailySales,
              category:        "General",
              peak_months:     [11, 12, 1],
              current_month:   now.getMonth() + 1,
            }),
          }
        );

        const data = await response.json();

        // Only save if price change is meaningful
        if (data.direction !== "maintain") {
          await ctx.db.insert("priceSuggestions", {
            productId:       inv.productId,
            currentPrice:    product.sellingPrice,
            suggestedPrice:  data.suggested_price,
            priceChange:     data.price_change,
            changeDirection: data.direction,
            reason:          data.reason,
            confidence:      data.confidence,
            factors: {
              stockLevel:  data.factors.stockLevel,
              demandTrend: data.factors.demandTrend,
              seasonality: data.factors.seasonality,
              daysOfStock: data.factors.daysOfStock,
            },
            status:    "pending",
            createdAt: Date.now(),
          });
          created++;
        }
      } catch {
        console.error(`Pricing failed for ${product._id}`);
      }
    }

    return { created };
  },
});

// ── Get all price suggestions ─────────────────
export const getPriceSuggestions = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    )),
  },
  handler: async (ctx, args) => {
    const suggestions = args.status
      ? await ctx.db
          .query("priceSuggestions")
          .withIndex("by_status", q => q.eq("status", args.status!))
          .order("desc")
          .collect()
      : await ctx.db
          .query("priceSuggestions")
          .order("desc")
          .collect();

    if (suggestions.length === 0) return [];

    const result = await Promise.all(
      suggestions.map(async s => {
        const product = await ctx.db.get(s.productId);
        return {
          ...s,
          productName: product?.name ?? "Unknown Product",
          productSku:  product?.sku  ?? "N/A",
        };
      })
    );

    return result;
  },
});

// ── Approve — applies price to product ───────
export const approvePriceSuggestion = mutation({
  args: { suggestionId: v.id("priceSuggestions") },
  handler: async (ctx, args) => {
    const suggestion = await ctx.db.get(args.suggestionId);
    if (!suggestion) throw new Error("Suggestion not found");

    // Apply price to product
    await ctx.db.patch(suggestion.productId, {
      sellingPrice: suggestion.suggestedPrice,
    });

    // Mark approved
    await ctx.db.patch(args.suggestionId, {
      status:    "approved",
      appliedAt: Date.now(),
    });

    return { success: true };
  },
});

// ── Reject suggestion ─────────────────────────
export const rejectPriceSuggestion = mutation({
  args: { suggestionId: v.id("priceSuggestions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.suggestionId, {
      status: "rejected",
    });
  },
});

// ── Stats for dashboard ───────────────────────
export const getPricingStats = query({
  args: {},
  handler: async (ctx) => {
    // Check table exists and has data
    const all = await ctx.db
      .query("priceSuggestions")
      .collect();

    // If empty return zeros cleanly
    if (all.length === 0) {
      return {
        pending:   0,
        increases: 0,
        decreases: 0,
        approved:  0,
        total:     0,
      };
    }

    return {
      total:     all.length,
      pending:   all.filter(s =>
        s.status === "pending"
      ).length,
      increases: all.filter(s =>
        s.status === "pending" &&
        s.changeDirection === "increase"
      ).length,
      decreases: all.filter(s =>
        s.status === "pending" &&
        s.changeDirection === "decrease"
      ).length,
      approved:  all.filter(s =>
        s.status === "approved"
      ).length,
    };
  },
});