// convex/guardrails.ts
// AI Guardrail System: detects high-risk actions, blocks them,
// creates approval records. Super Admin approves/rejects in /super-admin/approvals.
// On approval the blocked action executes here.

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// -- Configurable Thresholds ----------------------------------------------
export const GUARDRAIL_PO_THRESHOLD = 150_000;  // LKR: POs above this get blocked
export const GUARDRAIL_PRICE_DROP_PCT = 30;      // %: price drops above this get blocked

// -- Internal: Insert a pending approval record ---------------------------
export const createPendingApproval = internalMutation({
  args: {
    orgId:       v.optional(v.id("organizations")),
    requesterId: v.optional(v.id("users")),
    actionType:  v.string(),
    details:     v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("approvals", {
      orgId:       args.orgId,
      requesterId: args.requesterId,
      actionType:  args.actionType,
      details:     args.details,
      status:      "pending",
      createdAt:   Date.now(),
      updatedAt:   Date.now(),
    });
  },
});

// -- Internal: Execute the action that was previously blocked -------------
// Called by workflowAdmin.updateApprovalStatus when status -> "approved"
export const executeApprovedAction = internalMutation({
  args: {
    approvalId: v.id("approvals"),
    reviewerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId);
    if (!approval) throw new Error("Approval record not found");

    const details = approval.details as any;

    // LARGE_PO: Create the purchase order now
    if (approval.actionType === "LARGE_PO") {
      const {
        orgId, requesterId, supplierId,
        lineItems, totalValue, poNumber,
        notes, requestedDelivery, paymentMethod,
        chequeNumber, bankName, chequeAmount, chequeDate, chequeStatus,
        creditTermDays, dueDate,
      } = details;

      let initialPaymentStatus: "PENDING_ON_DELIVERY" | "CHEQUE_PENDING" | "DUE" | undefined;
      if (paymentMethod === "CASH_ON_DELIVERY") initialPaymentStatus = "PENDING_ON_DELIVERY";
      else if (paymentMethod === "CHEQUE")       initialPaymentStatus = "CHEQUE_PENDING";
      else if (paymentMethod === "CREDIT")       initialPaymentStatus = "DUE";

      await ctx.db.insert("purchaseOrders", {
        orgId:          orgId as Id<"organizations">,
        supplierId:     supplierId as Id<"suppliers">,
        createdBy:      requesterId as Id<"users">,
        poNumber,
        status:         "draft",
        lineItems,
        totalValue,
        paymentMethod,
        paymentStatus:  initialPaymentStatus,
        amountPaid:     paymentMethod ? 0 : undefined,
        chequeNumber,
        bankName,
        chequeAmount,
        chequeDate,
        chequeStatus:   chequeStatus ?? (paymentMethod === "CHEQUE" ? "ISSUED" : undefined),
        creditTermDays,
        dueDate,
        requestedDelivery,
        notes,
        createdAt:      Date.now(),
        updatedAt:      Date.now(),
      });

      return { executed: "LARGE_PO", poNumber };
    }

    // PRICE_DROP: Apply the new price now
    if (approval.actionType === "PRICE_DROP") {
      const { productId, newPrice } = details;
      await ctx.db.patch(productId as Id<"products">, { sellingPrice: newPrice });
      return { executed: "PRICE_DROP", productId, newPrice };
    }

    return { executed: "UNKNOWN" };
  },
});
