import { mutation, query, internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { getCallerUser, requireCallerOrg, getOrgEntity } from "./lib/roleGuard";
import {
  GUARDRAIL_PRICE_DROP_PCT,
  computePriceDropPct,
  hasPendingApprovalFor,
  notePriceChange,
  requirePositiveFinite,
} from "./guardrails";

// ── Generate price suggestions ───────
export const generatePriceSuggestions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const inventory = await ctx.db.query("inventory").collect();
    let created = 0;

    // Aggregate inventory by product to avoid duplicate passes across multiple locations
    const onHandByProduct = new Map<string, number>();
    for (const inv of inventory) {
      onHandByProduct.set(inv.productId, (onHandByProduct.get(inv.productId) ?? 0) + inv.onHand);
    }

    const processedProducts = new Set<string>();

    for (const inv of inventory) {
      if (processedProducts.has(inv.productId)) continue;
      processedProducts.add(inv.productId);

      const product = await ctx.db.get(inv.productId);
      if (!product || !product.isActive) continue;

      // 1. Check if there are already pending suggestions for this product
      const pendingSuggestions = await ctx.db
        .query("priceSuggestions")
        .withIndex("by_product", (q) => q.eq("productId", inv.productId))
        .filter((q) => q.eq(q.field("status"), "pending"))
        .collect();

      if (pendingSuggestions.length > 0) {
        if (pendingSuggestions.length > 1) {
          pendingSuggestions.sort((a, b) => (b.createdAt ?? b._creationTime) - (a.createdAt ?? a._creationTime));
          for (const dup of pendingSuggestions.slice(1)) {
            await ctx.db.delete(dup._id);
          }
        }
        continue;
      }

      // 2. Check if this suggestion was rejected within the last 48 hours
      const recentRejected = await ctx.db
        .query("priceSuggestions")
        .withIndex("by_product", (q) => q.eq("productId", inv.productId))
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "rejected"),
            q.gte(q.field("createdAt"), Date.now() - 48 * 60 * 60 * 1000)
          )
        )
        .first();
      if (recentRejected) continue;

      // 3. Check if price suggestion was recently approved (within 7 days)
      const recentApproved = await ctx.db
        .query("priceSuggestions")
        .withIndex("by_product", (q) => q.eq("productId", inv.productId))
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "approved"),
            q.gte(q.field("createdAt"), Date.now() - 7 * 86400000)
          )
        )
        .first();
      if (recentApproved) continue;

      const onHand = onHandByProduct.get(inv.productId) ?? inv.onHand;
      const currentPrice = product.sellingPrice;
      let suggestedPrice = currentPrice;
      let direction: "increase" | "decrease" | "maintain" = "maintain";
      let rationale = "Optimal pricing alignment";

      if (onHand <= product.safetyStock) {
        suggestedPrice = Math.round(currentPrice * 1.15);
        direction = "increase";
        rationale = "Low stock & high demand protection markup";
      } else if (onHand >= product.reorderPoint * 3) {
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
            stockLevel: `${onHand} units`,
            demandTrend: "High Demand",
            seasonality: "normal",
            daysOfStock: Math.round(onHand / 5),
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

    // Aggregate inventory by product
    const onHandByProduct = new Map<string, number>();
    for (const inv of inventory) {
      onHandByProduct.set(inv.productId, (onHandByProduct.get(inv.productId) ?? 0) + inv.onHand);
    }

    const processedProducts = new Set<string>();
    let created = 0;

    for (const inv of inventory) {
      if (processedProducts.has(inv.productId)) continue;
      processedProducts.add(inv.productId);

      const product = await ctx.db.get(inv.productId);
      if (!product || !product.isActive) continue;

      // 1. Check if there are already pending suggestions for this product
      const pendingSuggestions = await ctx.db
        .query("priceSuggestions")
        .withIndex("by_product", (q) => q.eq("productId", inv.productId))
        .filter((q) => q.eq(q.field("status"), "pending"))
        .collect();

      if (pendingSuggestions.length > 0) {
        if (pendingSuggestions.length > 1) {
          pendingSuggestions.sort((a, b) => (b.createdAt ?? b._creationTime) - (a.createdAt ?? a._creationTime));
          for (const dup of pendingSuggestions.slice(1)) {
            await ctx.db.delete(dup._id);
          }
        }
        continue;
      }

      // 2. Check if recently rejected (within 48 hours)
      const recentRejected = await ctx.db
        .query("priceSuggestions")
        .withIndex("by_product", (q) => q.eq("productId", inv.productId))
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "rejected"),
            q.gte(q.field("createdAt"), Date.now() - 48 * 60 * 60 * 1000)
          )
        )
        .first();
      if (recentRejected) continue;

      // 3. Check if recently approved (within 7 days)
      const recentApproved = await ctx.db
        .query("priceSuggestions")
        .withIndex("by_product", (q) => q.eq("productId", inv.productId))
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "approved"),
            q.gte(q.field("createdAt"), Date.now() - 7 * 86400000)
          )
        )
        .first();
      if (recentApproved) continue;

      const onHand = onHandByProduct.get(inv.productId) ?? inv.onHand;
      const currentPrice = product.sellingPrice;
      let suggestedPrice = currentPrice;
      let direction: "increase" | "decrease" | "maintain" = "maintain";
      let rationale = "Optimal pricing alignment";

      if (onHand <= product.safetyStock) {
        suggestedPrice = Math.round(currentPrice * 1.15);
        direction = "increase";
        rationale = "Low stock & high demand protection markup";
      } else if (onHand >= product.reorderPoint * 3) {
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
            stockLevel: `${onHand} units`,
            demandTrend: "High Demand",
            seasonality: "normal",
            daysOfStock: Math.round(onHand / 5),
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
    suggestions.sort((a, b) => (b.createdAt ?? b._creationTime) - (a.createdAt ?? a._creationTime));

    if (suggestions.length === 0) return [];

    // Deduplicate pending suggestions by productId, keeping the newest one
    const seenPendingProducts = new Set<string>();
    const deduplicatedSuggestions: typeof suggestions = [];

    for (const s of suggestions) {
      if (s.status === "pending") {
        if (seenPendingProducts.has(s.productId)) {
          continue;
        }
        seenPendingProducts.add(s.productId);
      }
      deduplicatedSuggestions.push(s);
    }

    const result = await Promise.all(
      deduplicatedSuggestions.map(async (s) => {
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

    // Deduplicate pending records by productId, keeping the latest one
    const pendingByProduct = new Map<string, typeof suggestions[0]>();
    for (const s of suggestions) {
      if (s.status === "pending") {
        const existing = pendingByProduct.get(s.productId);
        if (!existing || (s.createdAt ?? s._creationTime) > (existing.createdAt ?? existing._creationTime)) {
          pendingByProduct.set(s.productId, s);
        }
      }
    }
    const uniquePending = Array.from(pendingByProduct.values());

    return {
      total: uniquePending.length + suggestions.filter((s) => s.status !== "pending").length,
      pending: uniquePending.length,
      approved: suggestions.filter((s) => s.status === "approved").length,
      rejected: suggestions.filter((s) => s.status === "rejected").length,
      increases: uniquePending.filter((s) => s.changeDirection === "increase").length,
      decreases: uniquePending.filter((s) => s.changeDirection === "decrease").length,
      totalPotentialProfit: uniquePending.reduce((sum, s) => sum + (s.suggestedPrice - s.currentPrice), 0),
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
    const { user: caller, orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    const s = await getOrgEntity<Doc<"priceSuggestions">>(ctx, "priceSuggestions", args.suggestionId, orgId);
    if (s.status !== "pending") throw new ConvexError("Suggestion already processed");

    const product = await getOrgEntity<Doc<"products">>(ctx, "products", s.productId, orgId);

    const finalPrice = requirePositiveFinite(args.overridePrice ?? s.suggestedPrice, "Price");

    // ── GUARDRAIL: large (cumulative) price drops need Super Admin approval ──
    const { referencePrice, dropPct } = await computePriceDropPct(ctx, product, finalPrice);
    if (dropPct >= GUARDRAIL_PRICE_DROP_PCT) {
      if (await hasPendingApprovalFor(ctx, orgId, "PRICE_DROP", "suggestionId", args.suggestionId)) {
        throw new ConvexError("An approval request for this price change is already pending.");
      }
      const roundedDrop = Math.round(dropPct);
      await ctx.runMutation(internal.guardrails.createPendingApproval, {
        orgId,
        requesterId: caller._id,
        actionType: "PRICE_DROP",
        details: {
          productId: product._id,
          productName: product.name,
          productSku: product.sku,
          currentPrice: product.sellingPrice,
          referencePrice,
          newPrice: finalPrice,
          dropPct: roundedDrop,
          orgId,
          suggestionId: args.suggestionId,
        },
      });
      return {
        success: false,
        blocked: true,
        reason: `Price drop of ${roundedDrop}% on "${product.name}" exceeds the safe limit of ${GUARDRAIL_PRICE_DROP_PCT}%. A Super Admin approval request has been submitted — the price will update once approved.`,
      };
    }

    await notePriceChange(ctx, product, finalPrice);
    await ctx.db.patch(product._id, { sellingPrice: finalPrice, updatedAt: Date.now() });

    await ctx.db.patch(args.suggestionId, {
      status: "approved",
      suggestedPrice: finalPrice,
      appliedAt: Date.now(),
    });

    // Clean up any remaining duplicate pending suggestions for this same product
    const otherPending = await ctx.db
      .query("priceSuggestions")
      .withIndex("by_product", (q) => q.eq("productId", s.productId))
      .filter((q) =>
        q.and(
          q.neq(q.field("_id"), args.suggestionId),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();

    for (const duplicate of otherPending) {
      await ctx.db.delete(duplicate._id);
    }

    return { success: true, blocked: false };
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
    const s = await getOrgEntity<Doc<"priceSuggestions">>(ctx, "priceSuggestions", args.suggestionId, orgId);
    if (s.status !== "pending") throw new ConvexError("Suggestion already processed");

    await ctx.db.patch(args.suggestionId, {
      status: "rejected",
    });

    // Clean up any remaining duplicate pending suggestions for this same product
    const otherPending = await ctx.db
      .query("priceSuggestions")
      .withIndex("by_product", (q) => q.eq("productId", s.productId))
      .filter((q) =>
        q.and(
          q.neq(q.field("_id"), args.suggestionId),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();

    for (const duplicate of otherPending) {
      await ctx.db.delete(duplicate._id);
    }

    return { success: true };
  },
});

// ── Cleanup duplicate price suggestions mutation ────────
export const cleanupDuplicatePriceSuggestions = mutation({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    if (!caller || !caller.orgId) return { cleaned: 0 };

    const suggestions = await ctx.db
      .query("priceSuggestions")
      .withIndex("by_org", (q) => q.eq("orgId", caller.orgId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    suggestions.sort((a, b) => (b.createdAt ?? b._creationTime) - (a.createdAt ?? a._creationTime));

    const seen = new Set<string>();
    let cleaned = 0;
    for (const s of suggestions) {
      if (seen.has(s.productId)) {
        await ctx.db.delete(s._id);
        cleaned++;
      } else {
        seen.add(s.productId);
      }
    }

    return { cleaned };
  },
});