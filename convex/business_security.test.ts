/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { createTestSession } from "./lib/testAuth";

const modules = import.meta.glob("./**/*.ts");

const makeT = () => convexTest(schema, modules);
type T = ReturnType<typeof makeT>;

async function seedOrg(t: T, slug: string) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const orgId = await ctx.db.insert("organizations", {
      name: `Org ${slug}`,
      slug,
      inviteCode: slug.toUpperCase(),
      plan: "growth",
      isActive: true,
      createdAt: now,
    });
    const adminId = await ctx.db.insert("users", {
      email: `admin@${slug}.com`,
      name: `Admin ${slug}`,
      role: "admin",
      orgId,
      isActive: true,
      createdAt: now,
    });
    const supplierId = await ctx.db.insert("suppliers", {
      orgId,
      name: `Supplier ${slug}`,
      email: `supplier@${slug}.com`,
      leadTimeDays: 3,
      status: "active",
      isActive: true,
      createdAt: now,
    });
    const otherSupplierId = await ctx.db.insert("suppliers", {
      orgId,
      name: `Other Supplier ${slug}`,
      email: `other@${slug}.com`,
      leadTimeDays: 3,
      status: "active",
      isActive: true,
      createdAt: now,
    });
    const supplierUserId = await ctx.db.insert("users", {
      email: `supplier@${slug}.com`,
      name: `Supplier user ${slug}`,
      role: "supplier",
      orgId,
      supplierId,
      isActive: true,
      createdAt: now,
    });
    const locationId = await ctx.db.insert("locations", {
      orgId,
      name: "Main",
      type: "warehouse",
      isActive: true,
      createdAt: now,
    });
    const productId = await ctx.db.insert("products", {
      orgId,
      sku: `${slug}-1`,
      name: `Product ${slug}`,
      unit: "pcs",
      costPrice: 100,
      sellingPrice: 200,
      reorderPoint: 10,
      safetyStock: 5,
      trackBatches: false,
      primarySupplierId: supplierId,
      isActive: true,
      createdAt: now,
    });
    await ctx.db.insert("inventory", {
      orgId,
      productId,
      locationId,
      onHand: 20,
      reserved: 0,
      available: 20,
      lastUpdated: now,
    });
    return { orgId, adminId, supplierId, otherSupplierId, supplierUserId, locationId, productId };
  });
}

async function onHand(t: T, productId: Id<"products">, locationId: Id<"locations">) {
  return await t.run(async (ctx) => {
    const inv = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) => q.eq("productId", productId).eq("locationId", locationId))
      .first();
    return inv?.onHand ?? 0;
  });
}

describe("Business-logic security", () => {
  let t: T;
  let A: Awaited<ReturnType<typeof seedOrg>>;
  let B: Awaited<ReturnType<typeof seedOrg>>;
  let tokenA: string;
  let tokenB: string;
  let supplierTokenA: string;
  let superToken: string;

  beforeEach(async () => {
    t = makeT();
    A = await seedOrg(t, "alpha");
    B = await seedOrg(t, "beta");
    tokenA = await createTestSession(t, A.adminId);
    tokenB = await createTestSession(t, B.adminId);
    supplierTokenA = await createTestSession(t, A.supplierUserId);
    const superId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email: "root@platform.com",
        name: "Root",
        role: "super_admin",
        isActive: true,
        createdAt: Date.now(),
      }),
    );
    superToken = await createTestSession(t, superId);
  });

  // ── Finding 4: stock mutations verify product/location ownership ──
  it("rejects cross-org stock adjustments, stock-in and transfers", async () => {
    await expect(
      t.mutation(api.inventory.recordStockAdjustment, {
        token: tokenA,
        productId: B.productId,
        locationId: B.locationId,
        newOnHand: 0,
      }),
    ).rejects.toThrow(/another organization|Access Denied/i);

    await expect(
      t.mutation(api.inventory.recordStockIn, {
        token: tokenA,
        productId: A.productId,
        locationId: B.locationId,
        quantity: 5,
      }),
    ).rejects.toThrow(/another organization|Access Denied/i);

    await expect(
      t.mutation(api.inventory.transferStockBetweenLocations, {
        token: tokenA,
        productId: A.productId,
        fromLocationId: A.locationId,
        toLocationId: B.locationId,
        quantity: 1,
      }),
    ).rejects.toThrow(/another organization|Access Denied/i);

    await expect(
      t.mutation(api.inventory.recordStockIn, {
        token: tokenA,
        productId: A.productId,
        locationId: A.locationId,
        quantity: Number.NaN,
      }),
    ).rejects.toThrow(/positive number/i);

    expect(await onHand(t, B.productId, B.locationId)).toBe(20);
  });

  // ── Finding 3: unauthenticated detail reads ──
  it("rejects unauthenticated and cross-org detail reads", async () => {
    const poId = await t.run(async (ctx) =>
      ctx.db.insert("purchaseOrders", {
        orgId: B.orgId,
        supplierId: B.supplierId,
        poNumber: "PO-B",
        status: "draft",
        lineItems: [{ productId: B.productId, quantityOrdered: 1, unitCost: 1 }],
        totalValue: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    await expect(t.query(api.purchaseOrders.getPODetail, { poId })).rejects.toThrow(/Unauthorized/i);
    await expect(t.query(api.purchaseOrders.getPODetail, { poId, token: tokenA })).rejects.toThrow(
      /another organization/i,
    );
    await expect(t.query(api.purchaseOrders.getPOPayments, { poId, token: tokenA })).rejects.toThrow(
      /another organization/i,
    );
    await expect(t.query(api.inventory.getProductDetail, { productId: B.productId })).rejects.toThrow(
      /Unauthorized/i,
    );
    await expect(t.query(api.inventory.getStockHistory, { productId: B.productId })).rejects.toThrow(
      /Unauthorized/i,
    );
    await expect(t.query(api.inventory.getNextSku, {})).rejects.toThrow(/Unauthorized/i);
    await expect(
      t.query(api.suppliers.getSupplierDetail, { supplierId: B.supplierId }),
    ).rejects.toThrow(/Unauthorized/i);

    const own = await t.query(api.purchaseOrders.getPODetail, { poId, token: tokenB });
    expect(own?.poNumber).toBe("PO-B");
  });

  // ── Finding 1 + 7: approveSuggestion guardrail and single execution ──
  it("routes large reorder approvals through the guardrail and executes exactly once", async () => {
    const suggestionId = await t.run(async (ctx) =>
      ctx.db.insert("reorderSuggestions", {
        orgId: A.orgId,
        productId: A.productId,
        preferredSupplierId: A.supplierId,
        urgency: "high",
        suggestedQuantity: 10,
        rationale: "test",
        status: "pending",
        aiGenerated: true,
        createdAt: Date.now(),
      }),
    );

    // Foreign supplier is refused.
    await expect(
      t.mutation(api.reorder.approveSuggestion, {
        token: tokenA,
        suggestionId,
        supplierId: B.supplierId,
        quantity: 10,
        unitCost: 100,
      }),
    ).rejects.toThrow(/another organization/i);

    // Negative cost is refused.
    await expect(
      t.mutation(api.reorder.approveSuggestion, {
        token: tokenA,
        suggestionId,
        supplierId: A.supplierId,
        quantity: 10,
        unitCost: -100,
      }),
    ).rejects.toThrow(/positive number/i);

    // Understating the unit cost does not dodge the guardrail (catalogue cost 100 x 2000 = 200k).
    const res = await t.mutation(api.reorder.approveSuggestion, {
      token: tokenA,
      suggestionId,
      supplierId: A.supplierId,
      quantity: 2000,
      unitCost: 1,
    });
    expect(res.blocked).toBe(true);

    const state = await t.run(async (ctx) => ({
      pos: await ctx.db.query("purchaseOrders").collect(),
      approvals: await ctx.db.query("approvals").collect(),
      suggestion: await ctx.db.get(suggestionId),
    }));
    expect(state.pos).toHaveLength(0);
    expect(state.approvals).toHaveLength(1);
    expect(state.approvals[0].actionType).toBe("LARGE_PO");
    expect(state.suggestion?.status).toBe("pending");

    // Duplicate submission while pending is refused.
    await expect(
      t.mutation(api.reorder.approveSuggestion, {
        token: tokenA,
        suggestionId,
        supplierId: A.supplierId,
        quantity: 2000,
        unitCost: 100,
      }),
    ).rejects.toThrow(/already pending/i);

    const approvalId = state.approvals[0]._id;
    await t.mutation(api.workflowAdmin.updateApprovalStatus, {
      token: superToken,
      approvalId,
      status: "approved",
    });

    // Re-approval and approved→rejected are refused; no duplicate PO.
    await expect(
      t.mutation(api.workflowAdmin.updateApprovalStatus, { token: superToken, approvalId, status: "approved" }),
    ).rejects.toThrow(/already been approved/i);
    await expect(
      t.mutation(api.workflowAdmin.updateApprovalStatus, { token: superToken, approvalId, status: "rejected" }),
    ).rejects.toThrow(/already been approved/i);

    const after = await t.run(async (ctx) => ({
      pos: await ctx.db.query("purchaseOrders").collect(),
      suggestion: await ctx.db.get(suggestionId),
    }));
    expect(after.pos).toHaveLength(1);
    expect(after.pos[0].orgId).toBe(A.orgId);
    expect(after.suggestion?.status).toBe("approved");
  });

  it("does not let a rejected approval be flipped to approved", async () => {
    const approvalId = await t.run(async (ctx) =>
      ctx.db.insert("approvals", {
        orgId: A.orgId,
        actionType: "PRICE_DROP",
        details: { orgId: A.orgId, productId: A.productId, newPrice: 1 },
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    await t.mutation(api.workflowAdmin.updateApprovalStatus, { token: superToken, approvalId, status: "rejected" });
    await expect(
      t.mutation(api.workflowAdmin.updateApprovalStatus, { token: superToken, approvalId, status: "approved" }),
    ).rejects.toThrow(/already been rejected/i);
    const product = await t.run(async (ctx) => ctx.db.get(A.productId));
    expect(product?.sellingPrice).toBe(200);
  });

  // ── Finding 2: approvePriceSuggestion ──
  it("guards price suggestion approvals", async () => {
    const suggestionId = await t.run(async (ctx) =>
      ctx.db.insert("priceSuggestions", {
        orgId: A.orgId,
        productId: A.productId,
        currentPrice: 200,
        suggestedPrice: 180,
        priceChange: -20,
        changeDirection: "decrease",
        reason: "test",
        confidence: 0.9,
        factors: { stockLevel: "x", demandTrend: "x", seasonality: "x", daysOfStock: 1 },
        status: "pending",
        createdAt: Date.now(),
      }),
    );

    await expect(
      t.mutation(api.pricing.approvePriceSuggestion, { token: tokenA, suggestionId, overridePrice: -5 }),
    ).rejects.toThrow(/positive number/i);
    await expect(
      t.mutation(api.pricing.approvePriceSuggestion, { token: tokenB, suggestionId }),
    ).rejects.toThrow(/another organization/i);

    const res = await t.mutation(api.pricing.approvePriceSuggestion, {
      token: tokenA,
      suggestionId,
      overridePrice: 50,
    });
    expect(res.blocked).toBe(true);
    let product = await t.run(async (ctx) => ctx.db.get(A.productId));
    expect(product?.sellingPrice).toBe(200);

    // Approved within limit works once; second approval is refused.
    const ok = await t.mutation(api.pricing.approvePriceSuggestion, { token: tokenA, suggestionId });
    expect(ok.blocked).toBe(false);
    product = await t.run(async (ctx) => ctx.db.get(A.productId));
    expect(product?.sellingPrice).toBe(180);
    await expect(
      t.mutation(api.pricing.approvePriceSuggestion, { token: tokenA, suggestionId, overridePrice: 1 }),
    ).rejects.toThrow(/already processed/i);
  });

  // ── Finding 9: cumulative price drops ──
  it("blocks cumulative price drops made in small steps", async () => {
    const step1 = await t.mutation(api.inventory.updateProduct, {
      token: tokenA,
      productId: A.productId,
      sellingPrice: 150, // -25%
    });
    expect((step1 as any).blocked).toBeUndefined();
    const step2 = await t.mutation(api.inventory.updateProduct, {
      token: tokenA,
      productId: A.productId,
      sellingPrice: 120, // -20% step, but -40% vs reference 200
    });
    expect((step2 as any).blocked).toBe(true);
    const product = await t.run(async (ctx) => ctx.db.get(A.productId));
    expect(product?.sellingPrice).toBe(150);

    await expect(
      t.mutation(api.inventory.updateProduct, {
        token: tokenA,
        productId: A.productId,
        primarySupplierId: B.supplierId,
      }),
    ).rejects.toThrow(/another organization/i);
  });

  // ── Finding 5: PO status transitions, supplier ownership, single stock-in ──
  it("enforces PO transitions and never re-stocks a delivered PO", async () => {
    const poId = await t.run(async (ctx) =>
      ctx.db.insert("purchaseOrders", {
        orgId: A.orgId,
        supplierId: A.otherSupplierId,
        poNumber: "PO-A",
        status: "shipped",
        lineItems: [{ productId: A.productId, quantityOrdered: 10, quantityReceived: 0, unitCost: 100 }],
        totalValue: 1000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    // Supplier user of a different supplier cannot touch this PO.
    await expect(
      t.mutation(api.purchaseOrders.updatePOStatus, { token: supplierTokenA, poId, status: "delivered" }),
    ).rejects.toThrow(/another supplier/i);
    // Other org cannot touch it.
    await expect(
      t.mutation(api.purchaseOrders.updatePOStatus, { token: tokenB, poId, status: "cancelled" }),
    ).rejects.toThrow(/another organization/i);

    await t.mutation(api.purchaseOrders.updatePOStatus, { token: tokenA, poId, status: "delivered" });
    expect(await onHand(t, A.productId, A.locationId)).toBe(30);

    await expect(
      t.mutation(api.purchaseOrders.updatePOStatus, { token: tokenA, poId, status: "sent" }),
    ).rejects.toThrow(/Invalid status transition/i);
    await t.mutation(api.purchaseOrders.updatePOStatus, { token: tokenA, poId, status: "delivered" });
    expect(await onHand(t, A.productId, A.locationId)).toBe(30);
  });

  // ── Findings 8 + 10: PO creation and payment validation ──
  it("validates PO creation and payments", async () => {
    await expect(
      t.mutation(api.purchaseOrders.createPurchaseOrder, {
        token: tokenA,
        supplierId: A.supplierId,
        lineItems: [{ productId: A.productId, quantityOrdered: 10, unitCost: -50_000 }],
      }),
    ).rejects.toThrow(/positive number/i);
    await expect(
      t.mutation(api.purchaseOrders.createPurchaseOrder, {
        token: tokenA,
        supplierId: B.supplierId,
        lineItems: [{ productId: A.productId, quantityOrdered: 1, unitCost: 1 }],
      }),
    ).rejects.toThrow(/another organization/i);
    await expect(
      t.mutation(api.purchaseOrders.createPurchaseOrder, {
        token: tokenA,
        supplierId: A.supplierId,
        lineItems: [{ productId: B.productId, quantityOrdered: 1, unitCost: 1 }],
      }),
    ).rejects.toThrow(/another organization/i);

    const created = await t.mutation(api.purchaseOrders.createPurchaseOrder, {
      token: tokenA,
      supplierId: A.supplierId,
      lineItems: [{ productId: A.productId, quantityOrdered: 10, unitCost: 100 }],
    });
    const poId = (created as any).poId as Id<"purchaseOrders">;

    await expect(
      t.mutation(api.purchaseOrders.recordPOPayment, { token: tokenA, poId, method: "CREDIT", amount: -10 }),
    ).rejects.toThrow(/positive number/i);
    await expect(
      t.mutation(api.purchaseOrders.recordPOPayment, { token: tokenA, poId, method: "CREDIT", amount: 5000 }),
    ).rejects.toThrow(/outstanding balance/i);
    await expect(
      t.mutation(api.purchaseOrders.recordPOPayment, { token: tokenB, poId, method: "CREDIT", amount: 10 }),
    ).rejects.toThrow(/another organization/i);

    const paid = await t.mutation(api.purchaseOrders.recordPOPayment, {
      token: tokenA,
      poId,
      method: "CREDIT",
      amount: 1000,
    });
    expect(paid.paymentStatus).toBe("PAID");
  });

  // ── Finding 6: reorder generation is org-scoped and authenticated ──
  it("scopes reorder generation to the caller org", async () => {
    await expect(t.mutation(api.reorder.generateReorderSuggestionsPublic, {})).rejects.toThrow(/Unauthorized/i);

    // Drop both orgs below reorder point.
    await t.run(async (ctx) => {
      for (const inv of await ctx.db.query("inventory").collect()) {
        await ctx.db.patch(inv._id, { onHand: 1, available: 1 });
      }
    });
    const res = await t.mutation(api.reorder.generateReorderSuggestionsPublic, { token: tokenA });
    expect(res.created).toBe(1);
    const suggestions = await t.run(async (ctx) => ctx.db.query("reorderSuggestions").collect());
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].orgId).toBe(A.orgId);
    expect(suggestions[0].preferredSupplierId).toBe(A.supplierId);
  });
});
