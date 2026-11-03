// convex/purchaseOrders.ts
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { requireCallerOrg, getCallerUser, getSupplierForUser, getOrgEntity } from "./lib/roleGuard";
import { GUARDRAIL_PO_THRESHOLD, requirePositiveFinite } from "./guardrails";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

type POStatus = Doc<"purchaseOrders">["status"];

/**
 * Allowed PO status transitions. Terminal states (delivered / cancelled) can
 * never be left, so a PO can only be stocked-in once.
 */
export const PO_TRANSITIONS: Record<POStatus, POStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["confirmed", "shipped", "delivered", "cancelled"],
  confirmed: ["shipped", "delivered", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

/** Transitions a supplier user may perform on its own POs. */
const SUPPLIER_TRANSITIONS: Partial<Record<POStatus, POStatus[]>> = {
  sent: ["confirmed", "cancelled"],
  confirmed: ["shipped"],
};

/**
 * Loads a PO for the caller: must belong to the caller's org and, for supplier
 * users, must be addressed to the supplier linked to that user.
 */
async function getPOForCaller(
  ctx: QueryCtx | MutationCtx,
  caller: Doc<"users">,
  orgId: Id<"organizations">,
  poId: string,
): Promise<Doc<"purchaseOrders">> {
  const po = await getOrgEntity<Doc<"purchaseOrders">>(ctx, "purchaseOrders", poId, orgId);
  if (caller.role === "supplier") {
    const userSupplier = await getSupplierForUser(ctx, caller);
    if (!userSupplier || po.supplierId !== userSupplier._id) {
      throw new ConvexError("Access Denied: PO belongs to another supplier.");
    }
  }
  return po;
}

/** Validates PO lines and verifies the supplier and every product belong to the org. */
export async function validatePOInputs(
  ctx: MutationCtx,
  orgId: Id<"organizations">,
  supplierId: Id<"suppliers">,
  lineItems: { productId: Id<"products">; quantityOrdered: number; unitCost: number }[],
) {
  if (lineItems.length === 0) {
    throw new ConvexError("Purchase order must contain at least one item.");
  }
  if (lineItems.length > 500) {
    throw new ConvexError("Purchase order has too many line items.");
  }
  await getOrgEntity(ctx, "suppliers", supplierId, orgId);
  for (const line of lineItems) {
    requirePositiveFinite(line.quantityOrdered, "Quantity ordered");
    requirePositiveFinite(line.unitCost, "Unit cost");
    await getOrgEntity(ctx, "products", line.productId, orgId);
  }
}

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
    const { user: caller, orgId } = await requireCallerOrg(ctx, args.token);
    const exists = await ctx.db.get(args.poId);
    if (!exists) return null;
    const po = await getPOForCaller(ctx, caller, orgId, args.poId);

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
    await validatePOInputs(ctx, orgId, args.supplierId, args.lineItems);

    const poNumber = `PO-${Date.now()}`;
    const formattedLines = args.lineItems.map((line) => ({
      productId: line.productId,
      quantityOrdered: line.quantityOrdered,
      quantityReceived: 0,
      unitCost: line.unitCost,
      lineTotal: line.quantityOrdered * line.unitCost,
    }));

    const totalValue = formattedLines.reduce((sum, line) => sum + line.lineTotal, 0);

    // ── GUARDRAIL: Block large POs for Super Admin approval ──────────────
    if (totalValue > GUARDRAIL_PO_THRESHOLD) {
      await ctx.runMutation(internal.guardrails.createPendingApproval, {
        orgId,
        requesterId: caller._id,
        actionType: "LARGE_PO",
        details: {
          orgId,
          requesterId: caller._id,
          supplierId:        args.supplierId,
          lineItems:         formattedLines,
          totalValue,
          poNumber,
          notes:             args.notes,
          requestedDelivery: args.requestedDelivery,
          paymentMethod:     args.paymentMethod,
          chequeNumber:      args.chequeNumber,
          bankName:          args.bankName,
          chequeAmount:      args.chequeAmount,
          chequeDate:        args.chequeDate,
          chequeStatus:      args.chequeStatus,
          creditTermDays:    args.creditTermDays,
          dueDate:           args.dueDate,
        },
      });
      return {
        blocked: true,
        reason: `This purchase order (LKR ${totalValue.toLocaleString()}) exceeds the safety threshold of LKR ${GUARDRAIL_PO_THRESHOLD.toLocaleString()}. A Super Admin approval request has been submitted — the PO will be created once approved.`,
      };
    }
    // ─────────────────────────────────────────────────────────────────────

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
    const po = await getPOForCaller(ctx, caller, orgId, args.poId);

    if (po.status === args.status) return { success: true };

    const allowed =
      caller.role === "supplier"
        ? SUPPLIER_TRANSITIONS[po.status] ?? []
        : PO_TRANSITIONS[po.status];
    if (!allowed.includes(args.status)) {
      throw new ConvexError(`Invalid status transition: ${po.status} -> ${args.status}.`);
    }

    // If status is delivered, auto-stock in the received items. The transition
    // map guarantees this runs at most once per PO (delivered is terminal).
    if (args.status === "delivered") {
      const orgLocations = await ctx.db
        .query("locations")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect();
      const defaultLoc = orgLocations.find((l) => l.isActive) ?? orgLocations[0] ?? null;
      if (!defaultLoc) {
        throw new ConvexError("No location exists in your workspace to receive this delivery.");
      }

      {
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
      // Record receipt so a line can never be stocked in twice.
      ...(args.status === "delivered"
        ? {
            lineItems: po.lineItems.map((line) => ({
              ...line,
              quantityReceived: Math.max(line.quantityReceived ?? 0, line.quantityOrdered),
            })),
          }
        : {}),
    });

    // ── EMAIL NOTIFICATION: Notify supplier when PO is sent ──
    if (args.status === "sent" && po.status !== "sent") {
      const supplier = await ctx.db.get(po.supplierId);
      if (supplier && supplier.email) {
        const tenant = orgId ? await ctx.db.get(orgId) : null;
        const tenantName = tenant ? (tenant as any).name : "RetailMind";

        // Use the new communications API to schedule the email action
        await ctx.scheduler.runAfter(0, internal.communications.sendTemplateEmail, {
          templateName: "ORDER_CONFIRMED",
          targetEmail: supplier.email,
          variables: {
            userName: supplier.name,
            tenantName: tenantName,
            poNumber: po.poNumber,
            amount: po.totalValue.toString(),
            link: "https://retailmind.ai/supplier-dashboard",
          }
        });
      }
    }

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
    if (po.orgId !== orgId) throw new ConvexError("Access Denied");

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
    const { user: caller, orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager", "supplier"]);
    const po = await getPOForCaller(ctx, caller, orgId, args.poId);

    if (caller.role === "supplier" && args.method !== "CASH_ON_DELIVERY" && args.method !== "cash_on_delivery") {
      throw new ConvexError("Suppliers can only record Cash on Delivery payments.");
    }
    if (po.status === "cancelled") {
      throw new ConvexError("Cannot record a payment for a cancelled purchase order.");
    }
    requirePositiveFinite(args.amount, "Payment amount");

    const existingPayments = await ctx.db
      .query("poPayments")
      .withIndex("by_po", (q) => q.eq("poId", args.poId))
      .collect();
    const alreadyPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = Math.max(0, po.totalValue - alreadyPaid);
    if (args.amount > outstanding + 0.005) {
      throw new ConvexError(
        "Payment exceeds the outstanding balance (LKR " + outstanding.toLocaleString() + ").",
      );
    }

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
    if (po.orgId !== orgId) throw new ConvexError("Access Denied");

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
    const { user: caller, orgId } = await requireCallerOrg(ctx, args.token);
    await getPOForCaller(ctx, caller, orgId, args.poId);

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