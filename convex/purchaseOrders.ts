// convex/purchaseOrders.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getPurchaseOrders = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("sent"),
        v.literal("confirmed"),
        v.literal("shipped"),
        v.literal("delivered"),
        v.literal("cancelled"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const orders = args.status
      ? await ctx.db
          .query("purchaseOrders")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .collect()
      : await ctx.db.query("purchaseOrders").order("desc").collect();

    return await Promise.all(
      orders.map(async (po) => {
        const supplier = await ctx.db.get(po.supplierId);
        const createdBy = po.createdBy ? await ctx.db.get(po.createdBy) : null;
        return {
          ...po,
          supplierName: supplier?.name ?? "Unknown",
          createdByName: createdBy?.name ?? "System",
          itemCount: po.lineItems.length,
        };
      }),
    );
  },
});

export const getPOStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("purchaseOrders").collect();

    return {
      total: all.length,
      draft: all.filter((p) => p.status === "draft").length,
      sent: all.filter((p) => p.status === "sent").length,
      confirmed: all.filter((p) => p.status === "confirmed").length,
      shipped: all.filter((p) => p.status === "shipped").length,
      delivered: all.filter((p) => p.status === "delivered").length,
      cancelled: all.filter((p) => p.status === "cancelled").length,
      totalValue: all
        .filter((p) => p.status !== "cancelled")
        .reduce((sum, p) => sum + p.totalValue, 0),
    };
  },
});

export const updatePOStatus = mutation({
  args: {
    poId: v.id("purchaseOrders"),
    status: v.union(
      v.literal("sent"),
      v.literal("confirmed"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
    ),
    trackingNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ── Auth check ──────────────────────────
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // ── Get PO ──────────────────────────────
    const po = await ctx.db.get(args.poId);
    if (!po) throw new Error("Purchase order not found");

    // ── Valid state machine transitions ──────
    const validTransitions: Record<string, string[]> = {
      draft: ["sent", "cancelled"],
      sent: ["confirmed", "cancelled"],
      confirmed: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
    };

    const allowed = validTransitions[po.status] ?? [];
    if (!allowed.includes(args.status)) {
      throw new Error(`Invalid transition: ${po.status} → ${args.status}`);
    }

    // ── Patch DB ────────────────────────────
    await ctx.db.patch(args.poId, {
      status: args.status,
      updatedAt: Date.now(),
      ...(args.trackingNumber && {
        trackingNumber: args.trackingNumber,
      }),
    });

    return {
      success: true,
      poId: args.poId,
      newStatus: args.status,
    };
  },
});

export const createPurchaseOrder = mutation({
  args: {
    supplierId:        v.id("suppliers"),
    lineItems:         v.array(v.object({
      productId:       v.id("products"),
      quantityOrdered: v.number(),
      unitCost:        v.number(),
    })),
    requestedDelivery: v.optional(v.number()),
    notes:             v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ── Auth check ──────────────────────────
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");
    if (!["admin", "manager"].includes(user.role)) {
      throw new Error("Access denied");
    }

    // ── Generate PO number ───────────────────
    const count = await ctx.db.query("purchaseOrders").collect();
    const poNumber = `PO-${Date.now()}-${count.length + 1}`;

    // ── Calculate total ──────────────────────
    const totalValue = args.lineItems.reduce(
      (sum, item) => sum + item.quantityOrdered * item.unitCost,
      0,
    );
    // ── Insert PO ───────────────────────────
    const poId = await ctx.db.insert("purchaseOrders", {
      supplierId: args.supplierId,
      createdBy: user._id,
      poNumber,
      status: "draft",
      lineItems: args.lineItems.map((item) => ({
        productId: item.productId,
        quantityOrdered: item.quantityOrdered,
        quantityReceived: 0, // ← add default
        unitCost: item.unitCost,
        lineTotal: item.quantityOrdered * item.unitCost, // ← add calculated
      })),
      totalValue: Math.round(totalValue * 100) / 100,
      requestedDelivery: args.requestedDelivery,
      notes: args.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
      return { poId, poNumber, totalValue };
    },
  });