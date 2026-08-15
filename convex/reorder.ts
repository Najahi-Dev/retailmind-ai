import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCallerUser, requireCallerOrg } from "./lib/roleGuard";

// ── Nightly cron trigger — run for all products ──
export const generateReorderSuggestions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const inventory = await ctx.db.query("inventory").collect();
    let created = 0;

    for (const inv of inventory) {
      const product = await ctx.db.get(inv.productId);
      if (!product || !product.isActive) continue;

      // Already pending suggestion? skip
      const existing = await ctx.db
        .query("reorderSuggestions")
        .withIndex("by_product", (q) => q.eq("productId", inv.productId))
        .first();

      if (existing && existing.status === "pending") continue;

      const onHand = inv.onHand;
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

    let created = 0;
    for (const inv of inventory) {
      const product = await ctx.db.get(inv.productId);
      if (!product || !product.isActive) continue;

      const existing = await ctx.db
        .query("reorderSuggestions")
        .withIndex("by_product", (q) => q.eq("productId", inv.productId))
        .first();

      if (existing && existing.status === "pending") continue;

      if (inv.onHand <= product.reorderPoint) {
        let urgency: "critical" | "high" | "medium" | "low" = "medium";
        if (inv.onHand <= product.safetyStock) urgency = "critical";
        else if (inv.onHand <= product.reorderPoint * 0.5) urgency = "high";

        const suggestedQty = Math.max(product.reorderPoint, product.reorderPoint * 2 - inv.onHand);
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
          rationale: `Automated reorder suggestion based on inventory levels`,
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

    // Attach product + supplier info
    const result = await Promise.all(
      suggestions.map(async (s) => {
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
    let paymentStatus: string = "PENDING_ON_DELIVERY";
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

    return {
      pending: all.filter((s) => s.status === "pending").length,
      critical: all.filter(
        (s) => s.status === "pending" && s.urgency === "critical",
      ).length,
      high: all.filter((s) => s.status === "pending" && s.urgency === "high").length,
      approved: all.filter((s) => s.status === "approved").length,
      dismissed: all.filter((s) => s.status === "dismissed").length,
    };
  },
});
