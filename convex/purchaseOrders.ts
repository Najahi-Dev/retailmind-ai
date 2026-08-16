// convex/purchaseOrders.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireCallerOrg, getCallerUser, getSupplierForUser, requireRole, verifyEntityOrgAccess } from "./lib/roleGuard";

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
    if (!caller || !caller.orgId) return [];

    let orders = args.status
      ? await ctx.db
          .query("purchaseOrders")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .collect()
      : await ctx.db.query("purchaseOrders").order("desc").collect();

    // ── STRICT MULTI-TENANT WORKSPACE ISOLATION ──
    orders = orders.filter((po) => po.orgId === caller.orgId);

    // ── MULTI-TENANT SUPPLIER ROW-LEVEL DATA ISOLATION (RLS) ──
    if (caller.role === "supplier") {
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
    if (!caller || !caller.orgId) {
      return {
        total: 0,
        draft: 0,
        sent: 0,
        confirmed: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        totalValue: 0,
      };
    }

    let all = await ctx.db.query("purchaseOrders").collect();
    all = all.filter((p) => p.orgId === caller.orgId);

    // ── SCOPE METRICS FOR SUPPLIERS ──
    if (caller.role === "supplier") {
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

    if (caller && caller.orgId) {
      verifyEntityOrgAccess(po, caller.orgId);
    }

    const supplier = await ctx.db.get(po.supplierId);
    const createdBy = po.createdBy ? await ctx.db.get(po.createdBy) : null;

    const lineItemsWithDetails = await Promise.all(
      po.lineItems.map(async (line) => {
        const product = await ctx.db.get(line.productId);
        return {
          ...line,
          productName: product?.name ?? "Unknown",
          productSku: product?.sku ?? "",
          unit: product?.unit ?? "pcs",
        };
      }),
    );

    return {
      ...po,
      supplier,
      supplierName: supplier?.name ?? "Unknown",
      createdByName: createdBy?.name ?? "System",
      lineItems: lineItemsWithDetails,
    };
  },
});

export const createPurchaseOrder = mutation({
  args: {
    token: v.optional(v.string()),
    supplierId: v.id("suppliers"),
    requestedDelivery: v.optional(v.number()),
    notes: v.optional(v.string()),
    lineItems: v.array(
      v.object({
        productId: v.id("products"),
        quantityOrdered: v.number(),
        unitCost: v.number(),
      }),
    ),
    // Payment method
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
    if (args.lineItems.length === 0) {
      throw new Error("Purchase order must contain at least one item.");
    }

    const poNumber = `PO-${Date.now()}`;
    const formattedLines = args.lineItems.map((line) => ({
      productId: line.productId,
      quantityOrdered: line.quantityOrdered,
      quantityReceived: 0,
      unitCost: line.unitCost,
      lineTotal: line.quantityOrdered * line.unitCost,
    }));

    const totalValue = formattedLines.reduce((sum, line) => sum + line.lineTotal, 0);

    let initialPaymentStatus: "PENDING_ON_DELIVERY" | "CHEQUE_PENDING" | "DUE" | undefined;
    if (args.paymentMethod === "CASH_ON_DELIVERY") initialPaymentStatus = "PENDING_ON_DELIVERY";
    else if (args.paymentMethod === "CHEQUE") initialPaymentStatus = "CHEQUE_PENDING";
    else if (args.paymentMethod === "CREDIT") initialPaymentStatus = "DUE";

    const poId = await ctx.db.insert("purchaseOrders", {
      orgId,
      supplierId: args.supplierId,
      createdBy: caller._id,
      poNumber,
      status: "draft",
      lineItems: formattedLines,
      totalValue,
      paymentMethod: args.paymentMethod,
      paymentStatus: initialPaymentStatus,
      amountPaid: args.paymentMethod ? 0 : undefined,
      chequeNumber: args.chequeNumber,
      bankName: args.bankName,
      chequeAmount: args.chequeAmount,
      chequeDate: args.chequeDate,
      chequeStatus: args.chequeStatus ?? (args.paymentMethod === "CHEQUE" ? "ISSUED" : undefined),
      creditTermDays: args.creditTermDays,
      dueDate: args.dueDate,
      requestedDelivery: args.requestedDelivery,
      notes: args.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { poId, poNumber };
  },
});

export const updatePOStatus = mutation({
  args: {
    token: v.optional(v.string()),
    poId: v.id("purchaseOrders"),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("confirmed"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, args) => {
    const { user: caller, orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager", "supplier"]);
    const po = await ctx.db.get(args.poId);
    if (!po) throw new Error("Purchase order not found");

    if (orgId && po.orgId && po.orgId !== orgId) {
      throw new Error("Access Denied: PO belongs to another workspace.");
    }

    // If status is delivered, auto-stock in the received items
    if (args.status === "delivered" && po.status !== "delivered") {
      const locations = await ctx.db.query("locations").collect();
      const defaultLoc = locations.find((l) => !l.orgId || l.orgId === orgId) ?? (locations.length > 0 ? locations[0] : null);

      if (defaultLoc) {
        for (const line of po.lineItems) {
          const invList = await ctx.db
            .query("inventory")
            .withIndex("by_product_location", (q) =>
              q.eq("productId", line.productId).eq("locationId", defaultLoc._id),
            )
            .collect();

          const inv = invList.length > 0 ? invList[0] : null;
          const qty = line.quantityOrdered - (line.quantityReceived ?? 0);
          if (qty > 0) {
            if (inv) {
              const newOnHand = inv.onHand + qty;
              await ctx.db.patch(inv._id, {
                onHand: newOnHand,
                available: newOnHand - inv.reserved,
                lastUpdated: Date.now(),
              });
            } else {
              await ctx.db.insert("inventory", {
                orgId,
                productId: line.productId,
                locationId: defaultLoc._id,
                onHand: qty,
                reserved: 0,
                available: qty,
                lastUpdated: Date.now(),
              });
            }

            await ctx.db.insert("stockMovements", {
              orgId,
              productId: line.productId,
              locationId: defaultLoc._id,
              userId: caller._id,
              type: "stock_in",
              reason: `PO Delivered: ${po.poNumber}`,
              quantity: qty,
              createdAt: Date.now(),
            });
          }
        }
      }
    }

    await ctx.db.patch(args.poId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const getSupplierPOAlerts = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    if (!caller || caller.role !== "supplier" || !caller.orgId) return [];

    const userSupplier = await getSupplierForUser(ctx, caller);
    if (!userSupplier) return [];

    const pos = await ctx.db
      .query("purchaseOrders")
      .withIndex("by_supplier", (q) => q.eq("supplierId", userSupplier._id))
      .collect();

    const orgPOs = pos.filter((po) => po.orgId === caller.orgId && po.status === "sent");

    return await Promise.all(
      orgPOs.map(async (po) => {
        const creator = po.createdBy ? await ctx.db.get(po.createdBy) : null;
        return {
          ...po,
          placedBy: creator?.name ?? "Supermarket Manager",
          itemCount: po.lineItems.length,
        };
      })
    );
  },
});

// ── 7. SET PAYMENT METHOD ON A PO ──
export const setPOPaymentMethod = mutation({
  args: {
    token: v.optional(v.string()),
    poId: v.id("purchaseOrders"),
    paymentMethod: v.union(
      v.literal("CASH_ON_DELIVERY"),
      v.literal("CHEQUE"),
      v.literal("CREDIT"),
    ),
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
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    const po = await ctx.db.get(args.poId);
    if (!po) throw new Error("Purchase order not found");
    if (po.orgId && po.orgId !== orgId) throw new Error("Access Denied");

    // Derive initial payment status based on method
    let paymentStatus: "PENDING_ON_DELIVERY" | "CHEQUE_PENDING" | "DUE";
    if (args.paymentMethod === "CASH_ON_DELIVERY") {
      paymentStatus = "PENDING_ON_DELIVERY";
    } else if (args.paymentMethod === "CHEQUE") {
      paymentStatus = "CHEQUE_PENDING";
    } else {
      paymentStatus = "DUE";
    }

    await ctx.db.patch(args.poId, {
      paymentMethod: args.paymentMethod,
      paymentStatus,
      // Cheque fields
      chequeNumber: args.chequeNumber,
      bankName: args.bankName,
      chequeAmount: args.chequeAmount,
      chequeDate: args.chequeDate,
      chequeStatus: args.chequeStatus ?? (args.paymentMethod === "CHEQUE" ? "ISSUED" : undefined),
      // Credit fields
      creditTermDays: args.creditTermDays,
      dueDate: args.dueDate,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// ── 8. RECORD A PAYMENT FOR A PO ──
export const recordPOPayment = mutation({
  args: {
    token: v.optional(v.string()),
    poId: v.id("purchaseOrders"),
    method: v.union(
      v.literal("CASH_ON_DELIVERY"),
      v.literal("CHEQUE"),
      v.literal("CREDIT"),
      // Legacy
      v.literal("cash_on_delivery"),
      v.literal("credit"),
      v.literal("card"),
    ),
    amount: v.number(),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Cheque-specific fields for payment record
    chequeNumber: v.optional(v.string()),
    bankName: v.optional(v.string()),
    chequeDate: v.optional(v.number()),
    chequeStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user: caller, orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    const po = await ctx.db.get(args.poId);
    if (!po) throw new Error("Purchase order not found");
    if (po.orgId && po.orgId !== orgId) throw new Error("Access Denied");

    // Insert payment record
    await ctx.db.insert("poPayments", {
      orgId,
      poId: args.poId,
      recordedBy: caller._id,
      method: args.method,
      amount: args.amount,
      reference: args.reference,
      notes: args.notes,
      chequeNumber: args.chequeNumber,
      bankName: args.bankName,
      chequeDate: args.chequeDate,
      chequeStatus: args.chequeStatus,
      paidAt: Date.now(),
    });

    // Recalculate total paid
    const allPayments = await ctx.db
      .query("poPayments")
      .withIndex("by_po", (q) => q.eq("poId", args.poId))
      .collect();

    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    let paymentStatus: "PAID" | "PARTIALLY_PAID" | "CHEQUE_PENDING" | "DUE" | "PENDING_ON_DELIVERY";
    if (totalPaid >= po.totalValue) {
      paymentStatus = "PAID";
    } else if (totalPaid > 0) {
      paymentStatus = "PARTIALLY_PAID";
    } else if (args.method === "CHEQUE") {
      paymentStatus = "CHEQUE_PENDING";
    } else if (args.method === "CREDIT" || args.method === "credit") {
      paymentStatus = "DUE";
    } else {
      paymentStatus = "PENDING_ON_DELIVERY";
    }

    await ctx.db.patch(args.poId, {
      amountPaid: totalPaid,
      paymentStatus,
      paymentMethod: args.method,
      updatedAt: Date.now(),
    });

    return { success: true, totalPaid, paymentStatus };
  },
});

// ── 8b. UPDATE CHEQUE STATUS (ISSUED → CLEARED | BOUNCED) ──
export const updateChequeStatus = mutation({
  args: {
    token: v.optional(v.string()),
    poId: v.id("purchaseOrders"),
    chequeStatus: v.union(
      v.literal("ISSUED"),
      v.literal("CLEARED"),
      v.literal("BOUNCED"),
    ),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    const po = await ctx.db.get(args.poId);
    if (!po) throw new Error("Purchase order not found");
    if (po.orgId && po.orgId !== orgId) throw new Error("Access Denied");

    // When cheque clears, mark PO as PAID
    const paymentStatus =
      args.chequeStatus === "CLEARED" ? "PAID"
      : args.chequeStatus === "BOUNCED" ? "DUE"
      : "CHEQUE_PENDING";

    await ctx.db.patch(args.poId, {
      chequeStatus: args.chequeStatus,
      paymentStatus,
      amountPaid:
        args.chequeStatus === "CLEARED"
          ? (po.chequeAmount ?? po.totalValue)
          : (po as any).amountPaid,
      updatedAt: Date.now(),
    });
    return { success: true, paymentStatus };
  },
});

// ── 9. GET PAYMENT HISTORY FOR A PO ──
export const getPOPayments = query({
  args: {
    token: v.optional(v.string()),
    poId: v.id("purchaseOrders"),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    if (!caller || !caller.orgId) return [];

    const payments = await ctx.db
      .query("poPayments")
      .withIndex("by_po", (q) => q.eq("poId", args.poId))
      .order("desc")
      .collect();

    return await Promise.all(
      payments.map(async (p) => {
        const recordedBy = p.recordedBy ? await ctx.db.get(p.recordedBy) : null;
        return {
          ...p,
          recordedByName: recordedBy?.name ?? "System",
        };
      })
    );
  },
});

// ── 10. GET ALL PAYMENTS FOR ORGANIZATION (ADMIN/MANAGER) ──
export const getPayments = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);

    // Fetch all payments for the org
    const payments = await ctx.db
      .query("poPayments")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .order("desc")
      .collect();

    // Enrich payments with PO and supplier details
    return await Promise.all(
      payments.map(async (payment) => {
        // Get the PO for this payment
        const po = await ctx.db.get(payment.poId);
        if (!po) {
          // If PO is missing, return payment with null PO and supplier
          return {
            ...payment,
            po: null,
            supplier: null,
            recordedByName: "System",
          };
        }

        // Get the supplier for the PO
        const supplier = await ctx.db.get(po.supplierId);
        const recordedBy = payment.recordedBy ? await ctx.db.get(payment.recordedBy) : null;

        return {
          ...payment,
          po: {
            ...po,
            supplierName: supplier?.name ?? "Unknown",
          },
          supplier: {
            id: supplier?._id,
            name: supplier?.name ?? "Unknown",
            email: supplier?.email ?? "",
            phone: supplier?.phone ?? "",
            address: supplier?.address ?? "",
          },
          recordedByName: recordedBy?.name ?? "System",
        };
      })
    );
  },
});