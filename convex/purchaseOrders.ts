// convex/purchaseOrders.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCallerUser, getSupplierForUser, requireRole } from "./lib/roleGuard";

export const getPurchaseOrders = query({
  args: {
    token: v.optional(v.string()),
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
    const caller = await getCallerUser(ctx, args.token);
    let orders = args.status
      ? await ctx.db
          .query("purchaseOrders")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .collect()
      : await ctx.db.query("purchaseOrders").order("desc").collect();

    // ── MULTI-TENANT SUPPLIER ROW-LEVEL DATA ISOLATION (RLS) ──
    if (caller && caller.role === "supplier") {
      const userSupplier = await getSupplierForUser(ctx, caller);
      if (userSupplier) {
        orders = orders.filter((po) => po.supplierId === userSupplier._id);
      } else {
        orders = [];
      }
    }

    return await Promise.all(
      orders.map(async (po) => {
        const supplier = await ctx.db.get(po.supplierId);
        const createdBy = po.createdBy ? await ctx.db.get(po.createdBy) : null;
        return {
          ...po,
          supplierName: supplier?.name ?? "Unknown",
          supplierEmail: supplier?.email ?? "",
          supplierPhone: supplier?.phone ?? "",
          supplierAddress: supplier?.address ?? "",
          createdByName: createdBy?.name ?? "System",
          itemCount: po.lineItems.length,
        };
      }),
    );
  },
});

export const getPOStats = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    let all = await ctx.db.query("purchaseOrders").collect();

    // ── SCOPE METRICS FOR SUPPLIERS ──
    if (caller && caller.role === "supplier") {
      const userSupplier = await getSupplierForUser(ctx, caller);
      if (userSupplier) {
        all = all.filter((p) => p.supplierId === userSupplier._id);
      } else {
        all = [];
      }
    }

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

export const getPODetail = query({
  args: {
    poId: v.id("purchaseOrders"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    const po = await ctx.db.get(args.poId);
    if (!po) return null;

    // ── SINGLE-OBJECT IDOR AUTHORIZATION GUARD ──
    if (caller && caller.role === "supplier") {
      const userSupplier = await getSupplierForUser(ctx, caller);
      if (!userSupplier || po.supplierId !== userSupplier._id) {
        throw new Error("Access Denied: You are not authorized to view this purchase order.");
      }
    }

    const supplier = await ctx.db.get(po.supplierId);

    // Attach product name + sku to each line item
    const lineItems = await Promise.all(
      po.lineItems.map(async (line) => {
        const product = await ctx.db.get(line.productId);
        return {
          ...line,
          productName: product?.name ?? "Unknown",
          productSku: product?.sku ?? "",
        };
      }),
    );

    return {
      ...po,
      supplierName: supplier?.name ?? "Unknown",
      supplierEmail: supplier?.email ?? "",
      supplierPhone: supplier?.phone ?? "",
      supplierAddress: supplier?.address ?? "",
      lineItems,
    };
  },
});

export const updatePOStatus = mutation({
  args: {
    poId: v.id("purchaseOrders"),
    token: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("confirmed"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
    ),
    trackingNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    confirmedDelivery: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const caller = await requireRole(ctx, args.token);
    const po = await ctx.db.get(args.poId);
    if (!po) throw new Error("PO not found");

    // ── SUPPLIER MUTATION PERMISSION GUARD ──
    if (caller.role === "supplier") {
      const userSupplier = await getSupplierForUser(ctx, caller);
      if (!userSupplier || po.supplierId !== userSupplier._id) {
        await ctx.db.insert("securityLogs", {
          userId: caller._id,
          email: caller.email,
          role: caller.role,
          eventType: "UNAUTHORIZED_MUTATION",
          details: `Supplier user ${caller.email} attempted unauthorized status mutation on PO ${po.poNumber}`,
          targetId: args.poId,
          createdAt: Date.now(),
        });
        throw new Error("Access Denied: You are not authorized to update this purchase order.");
      }

      // Restrict allowed supplier status transitions (confirmed, shipped, delivered)
      if (!["confirmed", "shipped", "delivered"].includes(args.status)) {
        throw new Error("Access Denied: Suppliers can only confirm, ship, or mark delivery on purchase orders.");
      }
    }

    // ── When status changes TO delivered ────────
    // Update inventory onHand for each line item
    if (args.status === "delivered" && po.status !== "delivered") {
      for (const line of po.lineItems) {
        const inv = await ctx.db
          .query("inventory")
          .withIndex("by_product", (q) => q.eq("productId", line.productId))
          .first();

        if (inv) {
          const newOnHand = inv.onHand + line.quantityOrdered;
          const newAvailable = newOnHand - inv.reserved;

          await ctx.db.patch(inv._id, {
            onHand: newOnHand,
            available: newAvailable,
            lastUpdated: Date.now(),
          });

          // Create stock_in movement record
          await ctx.db.insert("stockMovements", {
            productId: line.productId,
            locationId: inv.locationId,
            type: "stock_in",
            reason: "Purchase Order Delivery",
            quantity: line.quantityOrdered,
            reference: po.poNumber,
            notes: `Received via ${po.poNumber}`,
            createdAt: Date.now(),
          });
        }
      }
    }

    // ── Safety check when cancelling ─
    if (args.status === "cancelled" && po.status === "delivered") {
      throw new Error("Cannot cancel a delivered PO");
    }

    // ── Update PO status and fulfillment fields ─────────────────────────
    await ctx.db.patch(args.poId, {
      status: args.status,
      trackingNumber: args.trackingNumber ?? po.trackingNumber,
      notes: args.notes ? `${po.notes ?? ''}\n[Supplier Note]: ${args.notes}`.trim() : po.notes,
      confirmedDelivery: args.confirmedDelivery ?? po.confirmedDelivery,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const createPurchaseOrder = mutation({
  args: {
    token: v.optional(v.string()),
    supplierId: v.id("suppliers"),
    lineItems: v.array(
      v.object({
        productId: v.id("products"),
        quantityOrdered: v.number(),
        unitCost: v.number(),
      }),
    ),
    requestedDelivery: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ── REJECT SUPPLIER CREATION ATTEMPTS ──
    const caller = await requireRole(ctx, args.token, ["admin", "manager"]);

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
      createdBy: caller._id,
      poNumber,
      status: "draft",
      lineItems: args.lineItems.map((item) => ({
        productId: item.productId,
        quantityOrdered: item.quantityOrdered,
        quantityReceived: 0,
        unitCost: item.unitCost,
        lineTotal: item.quantityOrdered * item.unitCost,
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

// ── SUPPLIER ALERTS FOR PLACED POs ───────────────────────
export const getSupplierPOAlerts = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    if (!caller || caller.role !== "supplier") return [];

    const userSupplier = await getSupplierForUser(ctx, caller);
    if (!userSupplier) return [];

    const supplierPOs = await ctx.db
      .query("purchaseOrders")
      .withIndex("by_supplier", (q) => q.eq("supplierId", userSupplier._id))
      .order("desc")
      .collect();

    // Active placed POs awaiting confirmation/fulfillment
    const placedPOs = supplierPOs.filter((po) => po.status === "sent");

    return await Promise.all(
      placedPOs.map(async (po) => {
        const creator = po.createdBy ? await ctx.db.get(po.createdBy) : null;
        return {
          _id: po._id,
          poNumber: po.poNumber,
          status: po.status,
          totalValue: po.totalValue,
          itemCount: po.lineItems.length,
          createdAt: po.createdAt,
          placedBy: creator?.name ?? "Store Management",
          requestedDelivery: po.requestedDelivery,
          notes: po.notes,
        };
      })
    );
  },
});