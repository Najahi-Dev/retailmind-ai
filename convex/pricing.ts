import { mutation, query, internalMutation, MutationCtx, QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { getCallerUser, requireCallerOrg, getOrgEntity } from "./lib/roleGuard";
import {
  GUARDRAIL_PRICE_DROP_PCT,
  computePriceDropPct,
  hasPendingApprovalFor,
  notePriceChange,
  requirePositiveFinite,
} from "./guardrails";

// ══════════════════════════════════════════════════════════════════
//  Pricing engine
//
//  One shared implementation used by both the nightly cron and the
//  "Run AI Price Scan" button. Every signal is derived from real data:
//    • stock level   — average on-hand per location vs. the product's
//                      per-location safety stock / reorder point
//    • sales velocity — `stock_out` movements over the last 30 days
//    • demand trend  — last 14 days of sales vs. the 14 days before
//    • seasonality   — last 30 days vs. the monthly average of days 31–90
//  `priceChange` is stored as a PERCENTAGE of the current price.
// ══════════════════════════════════════════════════════════════════

const DAY_MS = 86_400_000;
const MIN_MARGIN_MULTIPLIER = 1.05; // never price below cost + 5%
const MIN_CHANGE_PCT = 1; // ignore changes smaller than 1%
const MAX_CHANGE_PCT = 15; // never move a price more than 15% in one step
const REJECT_COOLDOWN_MS = 2 * DAY_MS;
const APPROVE_COOLDOWN_MS = 7 * DAY_MS;

type Direction = "increase" | "decrease";

type SalesStats = {
  last14: number;
  prev14: number; // days 15–28
  last30: number;
  last90: number;
};

type SuggestionDraft = {
  currentPrice: number;
  suggestedPrice: number;
  priceChange: number; // percent
  changeDirection: Direction;
  reason: string;
  confidence: number;
  factors: {
    stockLevel: string;
    demandTrend: string;
    seasonality: string;
    daysOfStock: number; // -1 = unknown (no sales history)
  };
  projectedImpact: number;
};

function roundPrice(price: number): number {
  // Whole rupees for normal prices, cents for very cheap items so that a
  // +8% on a 3 LKR item doesn't round straight back to 3.
  return price >= 100 ? Math.round(price) : Math.round(price * 100) / 100;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

async function getSalesStats(
  ctx: QueryCtx | MutationCtx,
  productId: Id<"products">,
  now: number,
): Promise<SalesStats> {
  const movements = await ctx.db
    .query("stockMovements")
    .withIndex("by_product_date", (q) =>
      q.eq("productId", productId).gte("createdAt", now - 90 * DAY_MS),
    )
    .collect();

  const stats: SalesStats = { last14: 0, prev14: 0, last30: 0, last90: 0 };
  for (const m of movements) {
    if (m.type !== "stock_out") continue; // sales only — not write-offs/transfers
    const qty = Math.abs(m.quantity);
    const age = now - m.createdAt;
    stats.last90 += qty;
    if (age < 30 * DAY_MS) stats.last30 += qty;
    if (age < 14 * DAY_MS) stats.last14 += qty;
    else if (age < 28 * DAY_MS) stats.prev14 += qty;
  }
  return stats;
}

/** Pure decision function. Returns null when no price change is justified. */
function computeSuggestion(
  product: Doc<"products">,
  locationOnHand: number[],
  sales: SalesStats,
): SuggestionDraft | null {
  const currentPrice = product.sellingPrice;
  const totalOnHand = locationOnHand.reduce((a, b) => a + b, 0);
  const locations = Math.max(1, locationOnHand.length);

  // Out of stock (or unpriced) → nothing to sell, nothing to reprice.
  if (totalOnHand <= 0 || !(currentPrice > 0)) return null;

  // Thresholds are per location, so compare the per-location average.
  const avgOnHand = totalOnHand / locations;
  const avgDailySales = sales.last30 / 30;
  const daysOfStock = avgDailySales > 0 ? totalOnHand / avgDailySales : null;

  // ── Demand trend ──
  let trend: "rising" | "falling" | "stable" | "none";
  let trendPct = 0;
  if (sales.last30 === 0) {
    trend = "none";
  } else if (sales.prev14 === 0) {
    trend = sales.last14 > 0 ? "rising" : "stable";
  } else {
    trendPct = ((sales.last14 - sales.prev14) / sales.prev14) * 100;
    trend = trendPct > 20 ? "rising" : trendPct < -20 ? "falling" : "stable";
  }

  // ── Seasonality (needs history older than 30 days to compare against) ──
  const olderMonthlyAvg = (sales.last90 - sales.last30) / 2;
  let season: "peak" | "off-peak" | "normal" | "unknown" = "unknown";
  if (olderMonthlyAvg > 0) {
    const ratio = sales.last30 / olderMonthlyAvg;
    season = ratio > 1.3 ? "peak" : ratio < 0.7 ? "off-peak" : "normal";
  }

  // ── Stock level ──
  const isCritical = avgOnHand <= product.safetyStock;
  const isLow = !isCritical && product.reorderPoint > 0 && avgOnHand <= product.reorderPoint;
  const overstockByThreshold = product.reorderPoint > 0 && avgOnHand >= product.reorderPoint * 3;
  const overstockByCover = daysOfStock !== null && daysOfStock > 90;
  const stockLevel = isCritical
    ? "critical"
    : isLow
      ? "low"
      : overstockByThreshold || overstockByCover
        ? "overstock"
        : "healthy";

  let direction: Direction | null = null;
  let pct = 0;
  const reasons: string[] = [];
  const perLoc = locations > 1 ? " per location" : "";

  // ── Increase: scarce stock AND proven demand ──
  // Low stock alone may just be a supply delay — require real, non-falling
  // sales and less than two weeks of cover before marking up.
  if (
    (isCritical || isLow) &&
    sales.last30 > 0 &&
    trend !== "falling" &&
    daysOfStock !== null &&
    daysOfStock < 14
  ) {
    direction = "increase";
    pct = 5;
    if (isCritical) pct += 3;
    if (trend === "rising") pct += 4;
    if (season === "peak") pct += 3;
    reasons.push(
      isCritical
        ? `stock (${round1(avgOnHand)}${perLoc}) is at or below safety stock (${product.safetyStock})`
        : `stock (${round1(avgOnHand)}${perLoc}) is below the reorder point (${product.reorderPoint})`,
    );
    reasons.push(`only ${Math.round(daysOfStock)} days of cover at ${round1(avgDailySales)} units/day`);
  }
  // ── Decrease: excess stock that isn't already selling through ──
  else if ((overstockByThreshold || overstockByCover) && trend !== "rising") {
    direction = "decrease";
    pct = 5;
    if (overstockByThreshold) {
      pct += 5;
      reasons.push(
        `stock (${round1(avgOnHand)}${perLoc}) is over 3× the reorder point (${product.reorderPoint})`,
      );
    }
    if (trend === "none") {
      pct += 3;
      reasons.push("no sales in the last 30 days");
    } else if (daysOfStock !== null && daysOfStock > 90) {
      if (daysOfStock > 180) pct += 3;
      reasons.push(`${Math.round(daysOfStock)} days of cover at the current sales rate`);
    }
    if (trend === "falling") pct += 2;
    if (season === "off-peak") pct += 2;
  }

  if (!direction) return null;
  pct = Math.min(pct, MAX_CHANGE_PCT);

  if (trend === "rising") {
    reasons.push(
      sales.prev14 === 0
        ? "sales picked up in the last 2 weeks"
        : `demand is up ${Math.round(trendPct)}% vs. the prior 2 weeks`,
    );
  }
  if (trend === "falling") reasons.push(`demand is down ${Math.abs(Math.round(trendPct))}% vs. the prior 2 weeks`);
  if (season === "peak") reasons.push("sales are running above the seasonal average");
  if (season === "off-peak") reasons.push("sales are below the seasonal average");

  // ── Price, with a margin floor ──
  const rawPrice = currentPrice * (1 + (direction === "increase" ? pct : -pct) / 100);
  let suggestedPrice: number;
  if (direction === "decrease") {
    // A markdown must never land below cost + 5% — and must never turn into
    // an increase when the product already sells near/below that floor.
    const floor = product.costPrice * MIN_MARGIN_MULTIPLIER;
    if (rawPrice < floor) {
      suggestedPrice = floor >= 100 ? Math.ceil(floor) : Math.ceil(floor * 100) / 100;
      reasons.push(`capped at the minimum 5% margin over cost`);
    } else {
      suggestedPrice = roundPrice(rawPrice);
    }
    if (suggestedPrice >= currentPrice) return null;
  } else {
    suggestedPrice = roundPrice(rawPrice);
  }

  const priceChange = round1(((suggestedPrice - currentPrice) / currentPrice) * 100);
  if (Math.abs(priceChange) < MIN_CHANGE_PCT) return null;

  // ── Confidence: how much real evidence backs this call ──
  let confidence = 0.55;
  if (sales.last30 > 0) confidence += 0.15; // velocity data exists
  if (
    (direction === "increase" && trend === "rising") ||
    (direction === "decrease" && (trend === "falling" || trend === "none"))
  ) {
    confidence += 0.15;
  } else if (trend === "stable") {
    confidence += 0.05;
  }
  if ((direction === "increase" && season === "peak") || (direction === "decrease" && season === "off-peak")) {
    confidence += 0.05;
  }
  if (direction === "decrease" && overstockByThreshold && overstockByCover) confidence += 0.05;
  if (direction === "increase" && isCritical && daysOfStock !== null && daysOfStock < 7) confidence += 0.05;
  confidence = Math.round(Math.min(confidence, 0.95) * 100) / 100;

  // ── Projected 30-day impact: price delta × units we expect to sell ──
  const expectedUnits = Math.min(totalOnHand, avgDailySales * 30);
  const projectedImpact = Math.round((suggestedPrice - currentPrice) * expectedUnits);

  const reasonText =
    `${direction === "increase" ? "Raise" : "Lower"} price ${Math.abs(priceChange)}% because ` +
    reasons.join(", ") +
    ".";

  return {
    currentPrice,
    suggestedPrice,
    priceChange,
    changeDirection: direction,
    reason: reasonText,
    confidence,
    factors: {
      stockLevel: `${totalOnHand} units · ${stockLevel}${locations > 1 ? ` · ${locations} locations` : ""}`,
      demandTrend:
        trend === "none"
          ? "No sales (30d)"
          : trend === "stable"
            ? "Stable"
            : trend === "rising"
              ? sales.prev14 === 0
                ? "Rising (new)"
                : `Rising (+${Math.round(trendPct)}%)`
              : `Falling (${Math.round(trendPct)}%)`,
      seasonality:
        season === "unknown"
          ? "Not enough history"
          : season === "peak"
            ? "Peak"
            : season === "off-peak"
              ? "Off-peak"
              : "Normal",
      daysOfStock: daysOfStock === null ? -1 : Math.round(daysOfStock),
    },
    projectedImpact,
  };
}

/**
 * Scan the given inventory rows and create / refresh / remove pending
 * suggestions so the queue always reflects current price, stock and sales.
 */
async function runPricingScan(ctx: MutationCtx, inventory: Doc<"inventory">[]) {
  const now = Date.now();
  let created = 0;
  let updated = 0;
  let removed = 0;

  const onHandByProduct = new Map<Id<"products">, number[]>();
  const orgByProduct = new Map<Id<"products">, Doc<"inventory">["orgId"]>();
  for (const inv of inventory) {
    const list = onHandByProduct.get(inv.productId) ?? [];
    list.push(inv.onHand);
    onHandByProduct.set(inv.productId, list);
    if (!orgByProduct.has(inv.productId)) orgByProduct.set(inv.productId, inv.orgId);
  }

  for (const [productId, locationOnHand] of onHandByProduct) {
    const product = await ctx.db.get(productId);

    const history = await ctx.db
      .query("priceSuggestions")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    const pending = history
      .filter((s) => s.status === "pending")
      .sort((a, b) => (b.createdAt ?? b._creationTime) - (a.createdAt ?? a._creationTime));
    // Remove duplicate pending rows, keep the newest.
    for (const dup of pending.slice(1)) {
      await ctx.db.delete(dup._id);
      removed++;
    }
    const existing = pending[0];

    if (!product || !product.isActive) {
      if (existing) {
        await ctx.db.delete(existing._id);
        removed++;
      }
      continue;
    }

    const decidedAt = (s: Doc<"priceSuggestions">) => s.decidedAt ?? s.appliedAt ?? s.createdAt;
    const inCooldown = history.some(
      (s) =>
        (s.status === "rejected" && now - decidedAt(s) < REJECT_COOLDOWN_MS) ||
        (s.status === "approved" && now - decidedAt(s) < APPROVE_COOLDOWN_MS),
    );

    const sales = await getSalesStats(ctx, productId, now);
    const draft = computeSuggestion(product, locationOnHand, sales);

    if (existing) {
      // Waiting on a Super Admin price-drop approval — leave it untouched.
      if (
        existing.orgId &&
        (await hasPendingApprovalFor(ctx, existing.orgId, "PRICE_DROP", "suggestionId", existing._id))
      ) {
        continue;
      }
      // Refresh the pending card, or drop it if conditions no longer justify it.
      if (draft) {
        await ctx.db.patch(existing._id, draft);
        updated++;
      } else {
        await ctx.db.delete(existing._id);
        removed++;
      }
    } else if (draft && !inCooldown) {
      await ctx.db.insert("priceSuggestions", {
        orgId: orgByProduct.get(productId),
        productId,
        ...draft,
        status: "pending",
        createdAt: now,
      });
      created++;
    }
  }

  return { created, updated, removed };
}

// ── Nightly cron: all organizations ──────────────────────────────
export const generatePriceSuggestions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const inventory = await ctx.db.query("inventory").collect();
    return await runPricingScan(ctx, inventory);
  },
});

// ── "Run AI Price Scan" button: caller's organization only ───────
export const generatePriceSuggestionsPublic = mutation({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    return await runPricingScan(ctx, inventory);
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
      // Estimated 30-day profit impact: price delta × expected units sold.
      totalPotentialProfit: uniquePending.reduce((sum, s) => sum + (s.projectedImpact ?? 0), 0),
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

    // The suggestion was computed against a price that has since been edited —
    // applying it now would be based on stale numbers.
    if (args.overridePrice === undefined && Math.abs(product.sellingPrice - s.currentPrice) > 0.005) {
      throw new ConvexError(
        `The price of "${product.name}" changed since this suggestion was made ` +
          `(was ${s.currentPrice}, now ${product.sellingPrice}). Run a new price scan to refresh it.`,
      );
    }

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
      priceChange: Math.round(((finalPrice - s.currentPrice) / s.currentPrice) * 1000) / 10,
      appliedAt: Date.now(),
      decidedAt: Date.now(),
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
      decidedAt: Date.now(),
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