import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getPurchaseOrders = query({
  args: {
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("confirmed"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled")
    )),
  },
  handler: async (ctx, args) => {
    const orders = args.status
      ? await ctx.db
          .query("purchaseOrders")
          .withIndex("by_status", q => q.eq("status", args.status!))
          .order("desc")
          .collect()
      : await ctx.db
          .query("purchaseOrders")
          .order("desc")
          .collect();

    return await Promise.all(
      orders.map(async (po) => {
        const supplier  = await ctx.db.get(po.supplierId);
        const createdBy = po.createdBy
          ? await ctx.db.get(po.createdBy)
          : null;

        return {
          ...po,
          supplierName: supplier?.name  ?? "Unknown",
          createdByName: createdBy?.name ?? "System",
          itemCount:    po.lineItems.length,
        };
      })
    );
  },
});

export const getPOStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("purchaseOrders").collect();
    return {
      total:     all.length,
      draft:     all.filter(p => p.status === "draft").length,
      sent:      all.filter(p => p.status === "sent").length,
      confirmed: all.filter(p => p.status === "confirmed").length,
      shipped:   all.filter(p => p.status === "shipped").length,
      delivered: all.filter(p => p.status === "delivered").length,
      cancelled: all.filter(p => p.status === "cancelled").length,
      totalValue: all
        .filter(p => !["cancelled"].includes(p.status))
        .reduce((sum, p) => sum + p.totalValue, 0),
    };
  },
});

// PO status update — state machine
export const updatePOStatus = mutation({
  args: {
    poId:   v.id("purchaseOrders"),
    status: v.union(
      v.literal("sent"),
      v.literal("confirmed"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    trackingNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const po = await ctx.db.get(args.poId);
    if (!po) throw new Error("PO not found");

    // Valid transitions
    const validTransitions: Record<string, string[]> = {
      draft:     ["sent",      "cancelled"],
      sent:      ["confirmed", "cancelled"],
      confirmed: ["shipped",   "cancelled"],
      shipped:   ["delivered"],
      delivered: [],
      cancelled: [],
    };

    if (!validTransitions[po.status]?.includes(args.status)) {
      throw new Error(
        `Invalid transition: ${po.status} → ${args.status}`
      );
    }

    await ctx.db.patch(args.poId, {
      status:        args.status,
      trackingNumber: args.trackingNumber,
    });

    return { success: true };
  },
});