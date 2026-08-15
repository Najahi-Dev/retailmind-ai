import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCallerUser, requireCallerOrg } from "./lib/roleGuard";

// ── Generate price suggestions ───────
export const generatePriceSuggestions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const inventory = await ctx.db.query("inventory").collect();
    let created = 0;

    for (const inv of inventory) {
      const product = await ctx.db.get(inv.productId);
      if (!product || !product.isActive) continue;

      const existing = await ctx.db
        .query("priceSuggestions")
        .withIndex("by_product", (q) => q.eq("productId", inv.productId))
        .first();

      if (existing && existing.status === "pending") continue;

      const currentPrice = product.sellingPrice;
      let suggestedPrice = currentPrice;
      let direction: "increase" | "decrease" | "maintain" = "maintain";
      let rationale = "Optimal pricing alignment";

      if (inv.onHand <= product.safetyStock) {
        suggestedPrice = Math.round(currentPrice * 1.15);
        direction = "increase";
        rationale = "Low stock & high demand protection markup";
      } else if (inv.onHand >= product.reorderPoint * 3) {
        suggestedPrice = Math.max(product.costPrice * 1.05, Math.round(currentPrice * 0.9));
        direction = "decrease";
        rationale = "Overstock clearance discount";
      }

      if (direction !== "maintain") {
        await ctx.db.insert("priceSuggestions", {
          orgId: inv.orgId,
          productId: product._id,
          currentPrice,
          suggestedPrice,
          priceChange: suggestedPrice - currentPrice,
          changeDirection: direction,
          reason: rationale,
          confidence: 0.92,
          factors: {
            stockLevel: `${inv.onHand} units`,
            demandTrend: "High Demand",
            seasonality: "normal",
            daysOfStock: Math.round(inv.onHand / 5),
          },
          status: "pending",
          createdAt: Date.now(),
        });
        created++;
      }
    }

    return { created };
  },
});

export const generatePriceSuggestionsPublic = mutation({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    const allInventory = await ctx.db.query("inventory").collect();
    const inventory = caller && caller.orgId ? allInventory.filter((i) => i.orgId === caller.orgId) : [];

    let created = 0;
    for (const inv of inventory) {
      const product = await ctx.db.get(inv.productId);
      if (!product || !product.isActive) continue;

      const existing = await ctx.db
        .query("priceSuggestions")
        .withIndex("by_product", (q) => q.eq("productId", inv.productId))
        .first();

      if (existing && existing.status === "pending") continue;

      const currentPrice = product.sellingPrice;
      let suggestedPrice = currentPrice;
      let direction: "increase" | "decrease" | "maintain" = "maintain";
      let rationale = "Optimal pricing alignment";

      if (inv.onHand <= product.safetyStock) {
        suggestedPrice = Math.round(currentPrice * 1.15);
        direction = "increase";
        rationale = "Low stock & high demand protection markup";
      } else if (inv.onHand >= product.reorderPoint * 3) {
        suggestedPrice = Math.max(product.costPrice * 1.05, Math.round(currentPrice * 0.9));
        direction = "decrease";
        rationale = "Overstock clearance discount";
      }

      if (direction !== "maintain") {
        await ctx.db.insert("priceSuggestions", {
          orgId: inv.orgId,
          productId: product._id,
          currentPrice,
          suggestedPrice,
          priceChange: suggestedPrice - currentPrice,
          changeDirection: direction,
          reason: rationale,
          confidence: 0.92,
          factors: {
            stockLevel: `${inv.onHand} units`,
            demandTrend: "High Demand",
            seasonality: "normal",
            daysOfStock: Math.round(inv.onHand / 5),
          },
          status: "pending",
          createdAt: Date.now(),
        });
        created++;
      }
    }

    return { created };
  },
});

// ── Get all price suggestions (Strict Org Scoped) ─────────────────
export const getPriceSuggestions = query({
  args: {
    token: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected")
      )
    ),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    if (!caller || !caller.orgId) return [];

    let suggestions = args.status
      ? await ctx.db
          .query("priceSuggestions")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .collect()
      : await ctx.db.query("priceSuggestions").order("desc").collect();

    suggestions = suggestions.filter((s) => s.orgId === caller.orgId);

    if (suggestions.length === 0) return [];

    const result = await Promise.all(
      suggestions.map(async (s) => {
        const product = await ctx.db.get(s.productId);
        return {
          ...s,
          productName: product?.name ?? "Unknown Product",
          productSku: product?.sku ?? "N/A",
        };
      })
    );

    return result;
  },
});

export const getPricingStats = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    if (!caller || !caller.orgId) {
      return { total: 0, pending: 0, approved: 0, rejected: 0, increases: 0, decreases: 0, totalPotentialProfit: 0 };
    }

    const all = await ctx.db.query("priceSuggestions").collect();
    const suggestions = all.filter((s) => s.orgId === caller.orgId);

    return {
      total: suggestions.length,
      pending: suggestions.filter((s) => s.status === "pending").length,
      approved: suggestions.filter((s) => s.status === "approved").length,
      rejected: suggestions.filter((s) => s.status === "rejected").length,
      increases: suggestions.filter((s) => s.changeDirection === "increase").length,
      decreases: suggestions.filter((s) => s.changeDirection === "decrease").length,
      totalPotentialProfit: suggestions
        .filter((s) => s.status === "pending")
        .reduce((sum, s) => sum + (s.suggestedPrice - s.currentPrice), 0),
    };
  },
});

// ── Approve Price Suggestion ──────────────────
export const approvePriceSuggestion = mutation({
  args: {
    token: v.optional(v.string()),
    suggestionId: v.id("priceSuggestions"),
    overridePrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    const s = await ctx.db.get(args.suggestionId);
    if (!s) throw new Error("Suggestion not found");

    if (orgId && s.orgId && s.orgId !== orgId) {
      throw new Error("Access Denied: Suggestion belongs to another workspace.");
    }

    const finalPrice = args.overridePrice ?? s.suggestedPrice;
    await ctx.db.patch(s.productId, { sellingPrice: finalPrice });

    await ctx.db.patch(args.suggestionId, {
      status: "approved",
      suggestedPrice: finalPrice,
    });

    return { success: true };
  },
});

// ── Reject Price Suggestion ───────────────────
export const rejectPriceSuggestion = mutation({
  args: {
    token: v.optional(v.string()),
    suggestionId: v.id("priceSuggestions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    const s = await ctx.db.get(args.suggestionId);
    if (!s) throw new Error("Suggestion not found");

    if (orgId && s.orgId && s.orgId !== orgId) {
      throw new Error("Access Denied: Suggestion belongs to another workspace.");
    }

    await ctx.db.patch(args.suggestionId, {
      status: "rejected",
    });

    return { success: true };
  },
});