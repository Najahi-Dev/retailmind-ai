import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCallerUser, requireCallerOrg } from "./lib/roleGuard";

// ── Nightly cron trigger — run for all products ──
export const generateReorderSuggestions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const inventory = await ctx.db.query("inventory").collect();
    let created = 0;

    // Aggregate inventory by product to avoid multi-location duplicate passes
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
        .query("reorderSuggestions")
        .withIndex("by_product", (q) => q.eq("productId", inv.productId))
        .filter((q) => q.eq(q.field("status"), "pending"))
        .collect();

      if (pendingSuggestions.length > 0) {
        // If multiple duplicate pending suggestions exist, keep the newest one and remove stale duplicates
        if (pendingSuggestions.length > 1) {
          pendingSuggestions.sort((a, b) => b.createdAt - a.createdAt);
          for (const dup of pendingSuggestions.slice(1)) {
            await ctx.db.delete(dup._id);
          }
        }
        continue;
      }

      // 2. Check if this suggestion was dismissed within the last 48 hours
      const recentDismissed = await ctx.db
        .query("reorderSuggestions")
        .withIndex("by_product", (q) => q.eq("productId", inv.productId))
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "dismissed"),
            q.gte(q.field("createdAt"), Date.now() - 48 * 60 * 60 * 1000)
          )
        )
        .first();
      if (recentDismissed) continue;

      // 3. Check if there is an active purchase order for this product (awaiting delivery)
      if (inv.orgId) {
        const activePOs = await ctx.db
          .query("purchaseOrders")
          .withIndex("by_org", (q) => q.eq("orgId", inv.orgId))
          .filter((q) =>
            q.and(
              q.neq(q.field("status"), "delivered"),
              q.neq(q.field("status"), "cancelled")
            )
          )
          .collect();

        const hasActivePO = activePOs.some((po) =>
          po.lineItems.some((item) => item.productId === inv.productId)
        );
        if (hasActivePO) continue;
      }

      const onHand = onHandByProduct.get(inv.productId) ?? inv.onHand;
      const reorderPoint = product.reorderPoint;
      const safetyStock = product.safetyStock;

      if (onHand <= reorderPoint) {
        let urgency: "critical" | "high" | "medium" | "low" = "medium";
        if (onHand <= safetyStock) urgency = "critical";
        else if (onHand <= reorderPoint * 0.5) urgency = "high";

        const suggestedQty = Math.max(reorderPoint, reorderPoint * 2 - onHand);

        const suppliers = await ctx.db.query("suppliers").collect();
        const preferredSupplier = suppliers.find((s) => !s.orgId || s.orgId === inv.orgId) ?? (suppliers.length > 0 ? suppliers[0] : null);
        if (!preferredSupplier) continue;

        await ctx.db.insert("reorderSuggestions", {
          orgId: inv.orgId,
          productId: product._id,
          preferredSupplierId: preferredSupplier._id,
          urgency,
          suggestedQuantity: suggestedQty,
          estimatedCost: suggestedQty * product.costPrice,
          orderByDate: Date.now() + 3 * 86400000,
          rationale: `Automated reorder suggestion based on inventory levels (${onHand} on hand vs ${reorderPoint} reorder point)`,
          status: "pending",
          aiGenerated: true,
          createdAt: Date.now(),
        });

        created++;
      }
    }

    return { created };
  },
});

export const generateReorderSuggestionsPublic = mutation({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    const allInventory = await ctx.db.query("inventory").collect();
    const inventory = caller && caller.orgId ? allInventory.filter((i) => i.orgId === caller.orgId) : allInventory;

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
        .query("reorderSuggestions")
        .withIndex("by_product", (q) => q.eq("productId", inv.productId))
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

      // 2. Check if recently dismissed
      const recentDismissed = await ctx.db
        .query("reorderSuggestions")
        .withIndex("by_product", (q) => q.eq("productId", inv.productId))
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "dismissed"),
            q.gte(q.field("createdAt"), Date.now() - 48 * 60 * 60 * 1000)
          )
        )
        .first();
      if (recentDismissed) continue;

      // 3. Check active POs
      const orgId = inv.orgId ?? caller?.orgId;
      if (orgId) {
        const activePOs = await ctx.db
          .query("purchaseOrders")
          .withIndex("by_org", (q) => q.eq("orgId", orgId))
          .filter((q) =>
            q.and(
              q.neq(q.field("status"), "delivered"),
              q.neq(q.field("status"), "cancelled")
            )
          )
          .collect();

        const hasActivePO = activePOs.some((po) =>
          po.lineItems.some((item) => item.productId === inv.productId)
        );
        if (hasActivePO) continue;
      }

      const onHand = onHandByProduct.get(inv.productId) ?? inv.onHand;
      if (onHand <= product.reorderPoint) {
        let urgency: "critical" | "high" | "medium" | "low" = "medium";
        if (onHand <= product.safetyStock) urgency = "critical";
        else if (onHand <= product.reorderPoint * 0.5) urgency = "high";

        const suggestedQty = Math.max(product.reorderPoint, product.reorderPoint * 2 - onHand);
        const allSuppliers = await ctx.db.query("suppliers").collect();
        const suppliers = caller && caller.orgId ? allSuppliers.filter((s) => s.orgId === caller.orgId) : allSuppliers;
        const preferredSupplier = suppliers.length > 0 ? suppliers[0] : null;
        if (!preferredSupplier) continue;

        await ctx.db.insert("reorderSuggestions", {
          orgId: inv.orgId,
          productId: product._id,
          preferredSupplierId: preferredSupplier._id,
          urgency,
          suggestedQuantity: suggestedQty,
          estimatedCost: suggestedQty * product.costPrice,
          orderByDate: Date.now() + 3 * 86400000,
          rationale: `Automated reorder suggestion based on inventory levels (${onHand} on hand vs ${product.reorderPoint} reorder point)`,
          status: "pending",
          aiGenerated: true,
          createdAt: Date.now(),
        });
        created++;
      }
    }
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
    const caller = await getCallerUser(ctx, args.token);
    const s = await ctx.db.get(args.suggestionId);
    if (!s) return null;

    if (caller && caller.orgId && s.orgId && s.orgId !== caller.orgId) {
      throw new Error("Access Denied: Resource belongs to another workspace.");
    }

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
    const allSuppliers = await ctx.db
      .query("suppliers")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const suppliers = caller && caller.orgId ? allSuppliers.filter((sup) => sup.orgId === caller.orgId) : allSuppliers;

    return { suggestion: s, product, supplier, inventory, allSuppliers: suppliers };
  },
});

// ── Approve — creates a draft PO ─────────────────
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
    const suggestion = await ctx.db.get(args.suggestionId);
    if (!suggestion) throw new Error("Suggestion not found");
    if (suggestion.status !== "pending") throw new Error("Already processed");

    if (orgId && suggestion.orgId && suggestion.orgId !== orgId) {
      throw new Error("Access Denied: Suggestion belongs to another workspace.");
    }

    // Derive initial payment status
    let paymentStatus: "PENDING_ON_DELIVERY" | "CHEQUE_PENDING" | "DUE" = "PENDING_ON_DELIVERY";
    if (args.paymentMethod === "CHEQUE") paymentStatus = "CHEQUE_PENDING";
    else if (args.paymentMethod === "CREDIT") paymentStatus = "DUE";

    // Create draft PO
    const poNumber = `PO-${Date.now()}`;
    const totalValue = args.quantity * args.unitCost;

    const poId = await ctx.db.insert("purchaseOrders", {
      orgId,
      supplierId: args.supplierId,
      createdBy: caller._id,
      poNumber,
      status: "draft",
      lineItems: [
        {
          productId: suggestion.productId,
          quantityOrdered: args.quantity,
          quantityReceived: 0,
          unitCost: args.unitCost,
          lineTotal: totalValue,
        },
      ],
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
    await ctx.db.patch(args.suggestionId, {
      status: "approved",
      suggestedQuantity: args.quantity,
      estimatedCost: totalValue,
    });

    // Clean up any remaining duplicate pending suggestions for this same product
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

    return { poId, poNumber };
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
    const suggestion = await ctx.db.get(args.suggestionId);
    if (suggestion && orgId && suggestion.orgId && suggestion.orgId !== orgId) {
      throw new Error("Access Denied: Suggestion belongs to another workspace.");
    }

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
