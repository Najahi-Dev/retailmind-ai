import { mutation, query, internalMutation, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { getCallerUser, requireCallerOrg, getOrgEntity } from "./lib/roleGuard";
import { consumeRateLimit, RATE_LIMITS } from "./lib/rateLimit";
import {
  GUARDRAIL_PO_THRESHOLD,
  hasPendingApprovalFor,
  requirePositiveFinite,
} from "./guardrails";

const MAX_PO_QUANTITY = 10_000_000;

/**
 * Generates reorder suggestions for ONE organization. Every document read or
 * linked (inventory, products, suppliers, POs) is scoped to `orgId`.
 */
async function generateSuggestionsForOrg(ctx: MutationCtx, orgId: Id<"organizations">) {
  const now = Date.now();
  const inventory = await ctx.db
    .query("inventory")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .collect();
  if (inventory.length === 0) return 0;

  // Load org-scoped lookups once (avoids N+1 collects).
  const orgSuppliers = await ctx.db
    .query("suppliers")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .collect();
  const activeSuppliers = orgSuppliers.filter((s) => s.isActive && s.status === "active");
  const supplierById = new Map(orgSuppliers.map((s) => [s._id, s]));

  const activePOs = await ctx.db
    .query("purchaseOrders")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .filter((q) =>
      q.and(q.neq(q.field("status"), "delivered"), q.neq(q.field("status"), "cancelled")),
    )
    .collect();
  const productsWithActivePO = new Set<string>();
  for (const po of activePOs) {
    for (const item of po.lineItems) productsWithActivePO.add(item.productId);
  }

  // Aggregate inventory by product to avoid multi-location duplicate passes
  const onHandByProduct = new Map<Id<"products">, number>();
  for (const inv of inventory) {
    onHandByProduct.set(inv.productId, (onHandByProduct.get(inv.productId) ?? 0) + inv.onHand);
  }

  let created = 0;
  for (const [productId, onHand] of onHandByProduct) {
    const product = await ctx.db.get(productId);
    if (!product || !product.isActive || product.orgId !== orgId) continue;

    // 1. Already pending? (dedupe stale duplicates)
    const pendingSuggestions = await ctx.db
      .query("reorderSuggestions")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
    if (pendingSuggestions.length > 0) {
      if (pendingSuggestions.length > 1) {
        pendingSuggestions.sort((a, b) => b.createdAt - a.createdAt);
        for (const dup of pendingSuggestions.slice(1)) {
          await ctx.db.delete(dup._id);
        }
      }
      continue;
    }

    // 2. Dismissed within the last 48 hours?
    const recentDismissed = await ctx.db
      .query("reorderSuggestions")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "dismissed"),
          q.gte(q.field("createdAt"), now - 48 * 60 * 60 * 1000),
        ),
      )
      .first();
    if (recentDismissed) continue;

    // 3. Already on an open PO?
    if (productsWithActivePO.has(productId)) continue;

    if (onHand > product.reorderPoint) continue;

    let urgency: "critical" | "high" | "medium" | "low" = "medium";
    if (onHand <= product.safetyStock) urgency = "critical";
    else if (onHand <= product.reorderPoint * 0.5) urgency = "high";

    const suggestedQty = Math.max(product.reorderPoint, product.reorderPoint * 2 - onHand);

    // Preferred supplier: the product's own primary supplier (if it belongs to
    // this org and is active), otherwise the first active supplier of this org.
    const primary = product.primarySupplierId ? supplierById.get(product.primarySupplierId) : undefined;
    const preferredSupplier =
      primary && primary.isActive && primary.status === "active" ? primary : activeSuppliers[0];
    if (!preferredSupplier) continue;

    await ctx.db.insert("reorderSuggestions", {
      orgId,
      productId: product._id,
      preferredSupplierId: preferredSupplier._id,
      urgency,
      suggestedQuantity: suggestedQty,
      estimatedCost: suggestedQty * product.costPrice,
      orderByDate: now + 3 * 86400000,
      rationale: `Automated reorder suggestion based on inventory levels (${onHand} on hand vs ${product.reorderPoint} reorder point)`,
      status: "pending",
      aiGenerated: true,
      createdAt: now,
    });
    created++;
  }
  return created;
}

// ── Nightly cron trigger — runs per organization ──
// Used by convex/crons.ts ("nightly-reorder-check"). Internal only.
export const generateReorderSuggestions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect();
    let created = 0;
    for (const org of orgs) {
      if (org.isActive === false) continue;
      created += await generateSuggestionsForOrg(ctx, org._id);
    }
    return { created };
  },
});

// ── On-demand generation for the caller's organization only ──
export const generateReorderSuggestionsPublic = mutation({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    await consumeRateLimit(ctx, `reorderGen:org:${orgId}`, RATE_LIMITS.expensiveJobPerOrg);
    const created = await generateSuggestionsForOrg(ctx, orgId);
    return { created };
  },
});

// ── Get all reorder suggestions ──────────────────
export const getReorderSuggestions = query({
  args: {
    token: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("dismissed"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    if (!caller || !caller.orgId) return [];

    let suggestions = args.status
      ? await ctx.db
          .query("reorderSuggestions")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .collect()
      : await ctx.db.query("reorderSuggestions").order("desc").collect();

    suggestions = suggestions.filter((s) => s.orgId === caller.orgId);
    suggestions.sort((a, b) => (b.createdAt ?? b._creationTime) - (a.createdAt ?? a._creationTime));

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

    // Attach product + supplier info
    const result = await Promise.all(
      deduplicatedSuggestions.map(async (s) => {
        const product = await ctx.db.get(s.productId);
        const supplier = s.preferredSupplierId
          ? await ctx.db.get(s.preferredSupplierId)
          : null;
        const inventory = product
          ? await ctx.db
              .query("inventory")
              .withIndex("by_product", (q) => q.eq("productId", s.productId))
              .first()
          : null;

        return {
          ...s,
          productName: product?.name ?? "Unknown",
          productSku: product?.sku ?? "",
          supplierName: supplier?.name ?? "Not assigned",
          onHand: inventory?.onHand ?? 0,
          reorderPoint: product?.reorderPoint ?? 0,
          costPrice: product?.costPrice ?? 0,
        };
      }),
    );

    // Sort by urgency priority
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return result.sort(
      (a, b) => (urgencyOrder[a.urgency] ?? 4) - (urgencyOrder[b.urgency] ?? 4),
    );
  },
});

// ── Get single suggestion detail ─────────────────
export const getReorderDetail = query({
  args: {
    suggestionId: v.id("reorderSuggestions"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, [
      "super_admin",
      "admin",
      "manager",
      "staff",
    ]);
    const exists = await ctx.db.get(args.suggestionId);
    if (!exists) return null;
    const s = await getOrgEntity<Doc<"reorderSuggestions">>(
      ctx,
      "reorderSuggestions",
      args.suggestionId,
      orgId,
    );

    const rawProduct = await ctx.db.get(s.productId);
    const product = rawProduct && rawProduct.orgId === orgId ? rawProduct : null;
    const rawSupplier = s.preferredSupplierId ? await ctx.db.get(s.preferredSupplierId) : null;
    const supplier = rawSupplier && rawSupplier.orgId === orgId ? rawSupplier : null;
    const inventory = product
      ? await ctx.db
          .query("inventory")
          .withIndex("by_product", (q) => q.eq("productId", s.productId))
          .filter((q) => q.eq(q.field("orgId"), orgId))
          .first()
      : null;

    const orgSuppliers = await ctx.db
      .query("suppliers")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    const suppliers = orgSuppliers.filter((sup) => sup.status === "active");

    return { suggestion: s, product, supplier, inventory, allSuppliers: suppliers };
  },
});

// ── Approve — creates a draft PO (or a LARGE_PO approval request) ─────────
export const approveSuggestion = mutation({
  args: {
    token: v.optional(v.string()),
    suggestionId: v.id("reorderSuggestions"),
    supplierId: v.id("suppliers"),
    quantity: v.number(),
    unitCost: v.number(),
    paymentMethod: v.optional(v.union(
      v.literal("CASH_ON_DELIVERY"),
      v.literal("CHEQUE"),
      v.literal("CREDIT"),
    )),
    // Cheque details
    chequeNumber: v.optional(v.string()),
    bankName: v.optional(v.string()),
    chequeAmount: v.optional(v.number()),
    chequeDate: v.optional(v.number()),
    chequeStatus: v.optional(v.string()),
    // Credit details
    creditTermDays: v.optional(v.number()),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user: caller, orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);

    const suggestion = await getOrgEntity<Doc<"reorderSuggestions">>(
      ctx,
      "reorderSuggestions",
      args.suggestionId,
      orgId,
    );
    if (suggestion.status !== "pending") throw new ConvexError("Suggestion already processed");

    const product = await getOrgEntity<Doc<"products">>(ctx, "products", suggestion.productId, orgId);
    const supplier = await getOrgEntity<Doc<"suppliers">>(ctx, "suppliers", args.supplierId, orgId);
    if (!supplier.isActive || supplier.status !== "active") {
      throw new ConvexError("Supplier is not active.");
    }

    const quantity = requirePositiveFinite(args.quantity, "Quantity");
    if (quantity > MAX_PO_QUANTITY) throw new ConvexError("Quantity is too large.");
    const unitCost = requirePositiveFinite(args.unitCost, "Unit cost");
    if (args.chequeAmount !== undefined) requirePositiveFinite(args.chequeAmount, "Cheque amount");

    const totalValue = quantity * unitCost;
    // The guardrail also considers the product's catalogue cost, so understating
    // the unit cost cannot be used to slip a large order under the threshold.
    const catalogueValue = quantity * Math.max(0, product.costPrice || 0);
    const guardrailValue = Math.max(totalValue, catalogueValue);

    const poNumber = `PO-${Date.now()}`;
    const lineItems = [
      {
        productId: suggestion.productId,
        quantityOrdered: quantity,
        quantityReceived: 0,
        unitCost,
        lineTotal: totalValue,
      },
    ];

    // ── GUARDRAIL: Block large POs for Super Admin approval ──────────────
    if (guardrailValue > GUARDRAIL_PO_THRESHOLD) {
      if (await hasPendingApprovalFor(ctx, orgId, "LARGE_PO", "suggestionId", args.suggestionId)) {
        throw new ConvexError("An approval request for this suggestion is already pending.");
      }
      await ctx.runMutation(internal.guardrails.createPendingApproval, {
        orgId,
        requesterId: caller._id,
        actionType: "LARGE_PO",
        details: {
          orgId,
          requesterId: caller._id,
          suggestionId: args.suggestionId,
          supplierId: args.supplierId,
          lineItems,
          totalValue,
          poNumber,
          requestedDelivery: Date.now() + 14 * 24 * 60 * 60 * 1000,
          paymentMethod: args.paymentMethod,
          chequeNumber: args.chequeNumber,
          bankName: args.bankName,
          chequeAmount: args.chequeAmount ?? (args.paymentMethod === "CHEQUE" ? totalValue : undefined),
          chequeDate: args.chequeDate,
          chequeStatus: args.chequeStatus,
          creditTermDays: args.creditTermDays,
          dueDate: args.dueDate,
        },
      });
      return {
        blocked: true as const,
        reason: `This purchase order (LKR ${guardrailValue.toLocaleString()}) exceeds the safety threshold of LKR ${GUARDRAIL_PO_THRESHOLD.toLocaleString()}. A Super Admin approval request has been submitted — the PO will be created once approved.`,
      };
    }
    // ─────────────────────────────────────────────────────────────────────

    // Derive initial payment status
    let paymentStatus: "PENDING_ON_DELIVERY" | "CHEQUE_PENDING" | "DUE" = "PENDING_ON_DELIVERY";
    if (args.paymentMethod === "CHEQUE") paymentStatus = "CHEQUE_PENDING";
    else if (args.paymentMethod === "CREDIT") paymentStatus = "DUE";

    const poId = await ctx.db.insert("purchaseOrders", {
      orgId,
      supplierId: supplier._id,
      createdBy: caller._id,
      poNumber,
      status: "draft",
      lineItems,
      totalValue,
      paymentMethod: args.paymentMethod,
      paymentStatus,
      amountPaid: 0,
      // Cheque fields
      chequeNumber: args.chequeNumber,
      bankName: args.bankName,
      chequeAmount: args.chequeAmount ?? totalValue,
      chequeDate: args.chequeDate,
      chequeStatus: args.chequeStatus ?? (args.paymentMethod === "CHEQUE" ? "ISSUED" : undefined),
      // Credit fields
      creditTermDays: args.creditTermDays,
      dueDate: args.dueDate,
      requestedDelivery: Date.now() + 14 * 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Mark suggestion approved
    await ctx.db.patch(suggestion._id, {
      status: "approved",
      suggestedQuantity: quantity,
      estimatedCost: totalValue,
    });

    // Clean up any remaining duplicate pending suggestions for this same product
    const otherPending = await ctx.db
      .query("reorderSuggestions")
      .withIndex("by_product", (q) => q.eq("productId", suggestion.productId))
      .filter((q) =>
        q.and(
          q.neq(q.field("_id"), suggestion._id),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();

    for (const duplicate of otherPending) {
      await ctx.db.delete(duplicate._id);
    }

    return { blocked: false as const, poId, poNumber };
  },
});

// ── Dismiss suggestion ────────────────────────────
export const dismissSuggestion = mutation({
  args: {
    token: v.optional(v.string()),
    suggestionId: v.id("reorderSuggestions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    const suggestion = await getOrgEntity<Doc<"reorderSuggestions">>(
      ctx,
      "reorderSuggestions",
      args.suggestionId,
      orgId,
    );
    if (suggestion.status !== "pending") throw new ConvexError("Suggestion already processed");

    await ctx.db.patch(args.suggestionId, {
      status: "dismissed",
      dismissedReason: args.reason,
    });

    if (suggestion) {
      const otherPending = await ctx.db
        .query("reorderSuggestions")
        .withIndex("by_product", (q) => q.eq("productId", suggestion.productId))
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
    }
  },
});

// ── Reorder stats for dashboard ───────────────────
export const getReorderStats = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    if (!caller || !caller.orgId) {
      return { pending: 0, critical: 0, high: 0, approved: 0, dismissed: 0 };
    }

    const allRecords = await ctx.db.query("reorderSuggestions").collect();
    const all = allRecords.filter((s) => s.orgId === caller.orgId);

    // Deduplicate pending records by productId, keeping the latest one
    const pendingByProduct = new Map<string, typeof all[0]>();
    for (const s of all) {
      if (s.status === "pending") {
        const existing = pendingByProduct.get(s.productId);
        if (!existing || s.createdAt > existing.createdAt) {
          pendingByProduct.set(s.productId, s);
        }
      }
    }
    const uniquePending = Array.from(pendingByProduct.values());

    return {
      pending: uniquePending.length,
      critical: uniquePending.filter((s) => s.urgency === "critical").length,
      high: uniquePending.filter((s) => s.urgency === "high").length,
      approved: all.filter((s) => s.status === "approved").length,
      dismissed: all.filter((s) => s.status === "dismissed").length,
    };
  },
});

// ── Cleanup duplicate suggestions mutation ────────
export const cleanupDuplicateSuggestions = mutation({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    if (!caller || !caller.orgId) return { cleaned: 0 };

    const suggestions = await ctx.db
      .query("reorderSuggestions")
      .withIndex("by_org", (q) => q.eq("orgId", caller.orgId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    suggestions.sort((a, b) => b.createdAt - a.createdAt);

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
