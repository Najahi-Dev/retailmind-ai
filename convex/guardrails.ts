// convex/guardrails.ts
// AI Guardrail System: detects high-risk actions, blocks them,
// creates approval records. Super Admin approves/rejects in /super-admin/approvals.
// On approval the blocked action executes here (exactly once).

import { internalMutation, MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// -- Configurable Thresholds ----------------------------------------------
export const GUARDRAIL_PO_THRESHOLD = 150_000;  // LKR: POs above this get blocked
export const GUARDRAIL_PRICE_DROP_PCT = 30;      // %: price drops above this get blocked

/** Rolling window over which cumulative price drops are measured. */
export const PRICE_REFERENCE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// -- Validation helpers ----------------------------------------------------
export function requirePositiveFinite(value: number, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new ConvexError(`${label} must be a positive number.`);
  }
  return value;
}

export function requireNonNegativeFinite(value: number, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new ConvexError(`${label} must be a non-negative number.`);
  }
  return value;
}

// -- Price reference (cumulative price-drop guardrail) ----------------------
// The price-drop guardrail compares a new price against a *reference* price,
// not just the current price, so that a series of small (<30%) cuts cannot add
// up to a large unapproved drop. The reference is the highest price the product
// had at the start of the current 30-day window (or the last Super-Admin
// approved price, which resets the baseline). Stored in the `priceReferences` table.
async function getPriceRefRow(ctx: MutationCtx, productId: Id<"products">) {
  return await ctx.db
    .query("priceReferences")
    .withIndex("by_product", (q) => q.eq("productId", productId))
    .unique();
}

async function upsertPriceRef(
  ctx: MutationCtx,
  product: Doc<"products">,
  existing: Doc<"priceReferences"> | null,
  referencePrice: number,
  windowStart: number,
) {
  if (existing) await ctx.db.patch(existing._id, { referencePrice, windowStart });
  else
    await ctx.db.insert("priceReferences", {
      productId: product._id,
      orgId: product.orgId,
      referencePrice,
      windowStart,
    });
}

/** Reference price used for the cumulative price-drop guardrail. */
export async function getPriceReference(ctx: MutationCtx, product: Doc<"products">): Promise<number> {
  const row = await getPriceRefRow(ctx, product._id);
  const fresh = row && Date.now() - row.windowStart < PRICE_REFERENCE_WINDOW_MS;
  if (fresh && row.referencePrice > product.sellingPrice) return row.referencePrice;
  return product.sellingPrice;
}

/** Percentage drop of `newPrice` relative to the product's reference price. */
export async function computePriceDropPct(
  ctx: MutationCtx,
  product: Doc<"products">,
  newPrice: number,
): Promise<{ referencePrice: number; dropPct: number }> {
  const referencePrice = await getPriceReference(ctx, product);
  if (referencePrice <= 0) return { referencePrice, dropPct: 0 };
  return { referencePrice, dropPct: ((referencePrice - newPrice) / referencePrice) * 100 };
}

/**
 * Must be called whenever a product's selling price changes.
 * `approvedBaseline` = true resets the reference to the new price (used when a
 * Super Admin approved the change); otherwise the reference is pinned to the
 * pre-change price for the rest of the window.
 */
export async function notePriceChange(
  ctx: MutationCtx,
  product: Doc<"products">,
  newPrice: number,
  approvedBaseline = false,
) {
  const now = Date.now();
  const row = await getPriceRefRow(ctx, product._id);
  const fresh = row && now - row.windowStart < PRICE_REFERENCE_WINDOW_MS;

  if (approvedBaseline) {
    await upsertPriceRef(ctx, product, row, newPrice, now);
    return;
  }
  if (fresh) {
    if (product.sellingPrice > row.referencePrice) {
      // keep window start, but never let the reference fall below the pre-change price
      await ctx.db.patch(row._id, { referencePrice: product.sellingPrice });
    }
    return;
  }
  await upsertPriceRef(ctx, product, row, product.sellingPrice, now);
}

/** True if a pending approval of `actionType` already references `field === value`. */
export async function hasPendingApprovalFor(
  ctx: MutationCtx,
  orgId: Id<"organizations">,
  actionType: string,
  field: string,
  value: string,
): Promise<boolean> {
  const approvals = await ctx.db
    .query("approvals")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .filter((q) => q.eq(q.field("status"), "pending"))
    .collect();
  return approvals.some(
    (a) => a.actionType === actionType && a.details && (a.details as any)[field] === value,
  );
}

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
// Called by workflowAdmin.updateApprovalStatus after it moved the approval from
// "pending" to "approved" in the same transaction. Executes at most once: the
// approval must be "approved" and not yet carry `details.executedAt`.
export const executeApprovedAction = internalMutation({
  args: {
    approvalId: v.id("approvals"),
    reviewerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.approvalId);
    if (!approval) throw new ConvexError("Approval record not found");
    if (approval.status !== "approved") {
      throw new ConvexError("Approval is not in the approved state.");
    }
    const details = (approval.details ?? {}) as any;
    if (details.executedAt) {
      throw new ConvexError("Approval has already been executed.");
    }
    if (!approval.orgId || (details.orgId && details.orgId !== approval.orgId)) {
      throw new ConvexError("Approval has an invalid organization.");
    }
    const orgId = approval.orgId;

    // Mark executed first (same transaction, so it is atomic with the action).
    const now = Date.now();
    await ctx.db.patch(args.approvalId, {
      details: { ...details, executedAt: now, executedBy: args.reviewerId },
      updatedAt: now,
    });

    // LARGE_PO: Create the purchase order now
    if (approval.actionType === "LARGE_PO") {
      const {
        requesterId, supplierId,
        lineItems, totalValue, poNumber,
        notes, requestedDelivery, paymentMethod,
        chequeNumber, bankName, chequeAmount, chequeDate, chequeStatus,
        creditTermDays, dueDate, suggestionId,
      } = details;

      // Re-verify ownership at execution time (fail closed).
      const supplier = await ctx.db.get(supplierId as Id<"suppliers">);
      if (!supplier || supplier.orgId !== orgId) throw new ConvexError("Supplier no longer valid for this organization.");
      for (const line of lineItems as any[]) {
        const product = await ctx.db.get(line.productId as Id<"products">);
        if (!product || product.orgId !== orgId) throw new ConvexError("Product no longer valid for this organization.");
        requirePositiveFinite(line.quantityOrdered, "Quantity");
        requirePositiveFinite(line.unitCost, "Unit cost");
      }

      let initialPaymentStatus: "PENDING_ON_DELIVERY" | "CHEQUE_PENDING" | "DUE" | undefined;
      if (paymentMethod === "CASH_ON_DELIVERY") initialPaymentStatus = "PENDING_ON_DELIVERY";
      else if (paymentMethod === "CHEQUE")       initialPaymentStatus = "CHEQUE_PENDING";
      else if (paymentMethod === "CREDIT")       initialPaymentStatus = "DUE";

      const poId = await ctx.db.insert("purchaseOrders", {
        orgId,
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
        createdAt:      now,
        updatedAt:      now,
      });

      // Reorder-suggestion originated PO: close the suggestion.
      if (suggestionId) {
        const sid = ctx.db.normalizeId("reorderSuggestions", suggestionId);
        const suggestion = sid ? await ctx.db.get(sid) : null;
        if (suggestion && suggestion.orgId === orgId && suggestion.status === "pending") {
          await ctx.db.patch(suggestion._id, {
            status: "approved",
            suggestedQuantity: (lineItems as any[])[0]?.quantityOrdered ?? suggestion.suggestedQuantity,
            estimatedCost: totalValue,
          });
        }
      }

      return { executed: "LARGE_PO", poNumber, poId };
    }

    // PRICE_DROP: Apply the new price now
    if (approval.actionType === "PRICE_DROP") {
      const { productId, newPrice, suggestionId } = details;
      const pid = ctx.db.normalizeId("products", productId);
      const product = pid ? await ctx.db.get(pid) : null;
      if (!product || product.orgId !== orgId) throw new ConvexError("Product no longer valid for this organization.");
      requireNonNegativeFinite(newPrice, "Price");

      await ctx.db.patch(product._id, { sellingPrice: newPrice, updatedAt: now });
      await notePriceChange(ctx, product, newPrice, true);

      if (suggestionId) {
        const sid = ctx.db.normalizeId("priceSuggestions", suggestionId);
        const suggestion = sid ? await ctx.db.get(sid) : null;
        if (suggestion && suggestion.orgId === orgId && suggestion.status === "pending") {
          await ctx.db.patch(suggestion._id, {
            status: "approved",
            suggestedPrice: newPrice,
            priceChange:
              suggestion.currentPrice > 0
                ? Math.round(((newPrice - suggestion.currentPrice) / suggestion.currentPrice) * 1000) / 10
                : suggestion.priceChange,
            appliedAt: now,
            decidedAt: now,
          });
        }
      }
      return { executed: "PRICE_DROP", productId: product._id, newPrice };
    }

    return { executed: "UNKNOWN" };
  },
});
