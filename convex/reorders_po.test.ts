/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { createTestSession } from "./lib/testAuth";
import { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

describe("Automated Reordering & Purchase Orders Engine", () => {
  let t: ReturnType<typeof convexTest>;
  let orgId: Id<"organizations">;
  let adminId: Id<"users">;
  let staffId: Id<"users">;
  let adminToken: string;
  let staffToken: string;
  let warehouseId: Id<"locations">;
  let supplierId: Id<"suppliers">;
  let categoryId: Id<"categories">;

  beforeEach(async () => {
    t = convexTest(schema, modules);

    // Seed organization
    orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Metro Retail",
        slug: "metro-retail",
        inviteCode: "METRO123",
        plan: "growth",
        isActive: true,
        createdAt: Date.now(),
      });
    });

    // Seed admin
    adminId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "admin@metro.com",
        name: "Metro Admin",
        role: "admin",
        orgId,
        isActive: true,
        createdAt: Date.now(),
      });
    });
    adminToken = await createTestSession(t, adminId);

    // Seed staff
    staffId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "staff@metro.com",
        name: "Metro Staff",
        role: "staff",
        orgId,
        isActive: true,
        createdAt: Date.now(),
      });
    });
    staffToken = await createTestSession(t, staffId);

    // Seed location
    warehouseId = await t.mutation(api.inventory.addLocation, {
      token: adminToken,
      name: "Main Distribution Center",
      type: "warehouse",
    });

    // Seed category
    categoryId = await t.mutation(api.inventory.addCategory, {
      token: adminToken,
      name: "Beverages",
    });

    // Seed supplier
    supplierId = await t.run(async (ctx) => {
      return await ctx.db.insert("suppliers", {
        orgId,
        name: "Apex Beverage Supplies",
        email: "orders@apexbeverages.com",
        leadTimeDays: 3,
        status: "active",
        isActive: true,
        createdAt: Date.now(),
      });
    });
  });

  it("generates reorder suggestions when stock drops below reorder point", async () => {
    // Create product with low stock
    const productId = await t.mutation(api.inventory.createProduct, {
      token: adminToken,
      sku: "SKU-SODA-CAN",
      name: "Sparkling Soda Can",
      unit: "pcs",
      costPrice: 40,
      sellingPrice: 70,
      reorderPoint: 50,
      safetyStock: 10,
      trackBatches: false,
      categoryId,
      primarySupplierId: supplierId,
      initialLocationId: warehouseId,
      initialQuantity: 8, // below safety stock (10) -> urgency: critical
    });

    // Trigger reorder generation
    const res = await t.mutation(api.reorder.generateReorderSuggestionsPublic, {
      token: adminToken,
    });
    expect(res.created).toBeGreaterThanOrEqual(1);

    // Query suggestions
    const suggestions = await t.query(api.reorder.getReorderSuggestions, {
      token: adminToken,
    });

    const sodaSuggestion = suggestions.find((s) => s.productId === productId);
    expect(sodaSuggestion).toBeDefined();
    expect(sodaSuggestion?.urgency).toBe("critical");
    expect(sodaSuggestion?.status).toBe("pending");
    expect(sodaSuggestion?.suggestedQuantity).toBe(92); // 50 * 2 - 8 = 92
    expect(sodaSuggestion?.estimatedCost).toBe(92 * 40); // 3680
  });

  it("approves reorder suggestion, creating a Purchase Order", async () => {
    const productId = await t.mutation(api.inventory.createProduct, {
      token: adminToken,
      sku: "SKU-ORANGE-JUICE",
      name: "Orange Juice 1L",
      unit: "litre",
      costPrice: 150,
      sellingPrice: 220,
      reorderPoint: 40,
      safetyStock: 15,
      trackBatches: false,
      categoryId,
      primarySupplierId: supplierId,
      initialLocationId: warehouseId,
      initialQuantity: 12,
    });

    await t.mutation(api.reorder.generateReorderSuggestionsPublic, {
      token: adminToken,
    });

    const suggestions = await t.query(api.reorder.getReorderSuggestions, {
      token: adminToken,
    });
    const suggestion = suggestions.find((s) => s.productId === productId);
    expect(suggestion).toBeDefined();

    // Staff role should be refused approval
    await expect(
      t.mutation(api.reorder.approveSuggestion, {
        token: staffToken,
        suggestionId: suggestion!._id,
        supplierId,
        quantity: 50,
        unitCost: 150,
        paymentMethod: "CASH_ON_DELIVERY",
      })
    ).rejects.toThrow(/Access denied: Required role in \[admin, manager\]/i);

    // Admin approves suggestion
    const approvalRes = await t.mutation(api.reorder.approveSuggestion, {
      token: adminToken,
      suggestionId: suggestion!._id,
      supplierId,
      quantity: 50,
      unitCost: 150,
      paymentMethod: "CASH_ON_DELIVERY",
    });

    expect(approvalRes.poId).toBeDefined();
    expect(approvalRes.poNumber).toBeDefined();

    // Verify PO was created in database
    const po = await t.query(api.purchaseOrders.getPODetail, {
      token: adminToken,
      poId: approvalRes.poId!,
    });
    expect(po).toBeDefined();
    expect(po?.totalValue).toBe(50 * 150);
    expect(po?.status).toBe("draft");
    expect(po?.lineItems[0].productId).toBe(productId);
    expect(po?.lineItems[0].quantityOrdered).toBe(50);
  });

  it("dismisses reorder suggestions with a documented reason", async () => {
    const productId = await t.mutation(api.inventory.createProduct, {
      token: adminToken,
      sku: "SKU-LEMON-TEA",
      name: "Lemon Iced Tea",
      unit: "pcs",
      costPrice: 60,
      sellingPrice: 90,
      reorderPoint: 20,
      safetyStock: 5,
      trackBatches: false,
      categoryId,
      primarySupplierId: supplierId,
      initialLocationId: warehouseId,
      initialQuantity: 4,
    });

    await t.mutation(api.reorder.generateReorderSuggestionsPublic, {
      token: adminToken,
    });

    const suggestions = await t.query(api.reorder.getReorderSuggestions, {
      token: adminToken,
    });
    const suggestion = suggestions.find((s) => s.productId === productId);
    expect(suggestion).toBeDefined();

    await t.mutation(api.reorder.dismissSuggestion, {
      token: adminToken,
      suggestionId: suggestion!._id,
      reason: "Product being phased out",
    });

    // Query again - suggestion status must now be dismissed
    const updated = await t.query(api.reorder.getReorderDetail, {
      token: adminToken,
      suggestionId: suggestion!._id,
    });
    expect(updated?.suggestion.status).toBe("dismissed");
    expect(updated?.suggestion.dismissedReason).toBe("Product being phased out");
  });

  it("updates PO status to delivered and automatically stocks in received items", async () => {
    const productId = await t.mutation(api.inventory.createProduct, {
      token: adminToken,
      sku: "SKU-COLA-CAN",
      name: "Classic Cola",
      unit: "pcs",
      costPrice: 50,
      sellingPrice: 85,
      reorderPoint: 30,
      safetyStock: 10,
      trackBatches: false,
      categoryId,
      primarySupplierId: supplierId,
      initialLocationId: warehouseId,
      initialQuantity: 20,
    });

    // Create PO directly (below GUARDRAIL_PO_THRESHOLD 150,000)
    const createPoRes = await t.mutation(api.purchaseOrders.createPurchaseOrder, {
      token: adminToken,
      supplierId,
      lineItems: [
        {
          productId,
          quantityOrdered: 100,
          unitCost: 50,
        },
      ],
      paymentMethod: "CASH_ON_DELIVERY",
    });

    const poId = createPoRes.poId;
    expect(poId).toBeDefined();

    // Transition status to sent, confirmed, then delivered
    await t.mutation(api.purchaseOrders.updatePOStatus, {
      token: adminToken,
      poId: poId!,
      status: "sent",
    });

    await t.mutation(api.purchaseOrders.updatePOStatus, {
      token: adminToken,
      poId: poId!,
      status: "confirmed",
    });

    // Transitioning to 'delivered' should auto-stock in the 100 items!
    await t.mutation(api.purchaseOrders.updatePOStatus, {
      token: adminToken,
      poId: poId!,
      status: "delivered",
    });

    // Verify stock is now 20 + 100 = 120
    const detail = await t.query(api.inventory.getProductDetail, {
      token: adminToken,
      productId,
    });
    expect(detail?.inventory?.onHand).toBe(120);

    // Verify stock movement record was created with type 'stock_in'
    const movements = await t.query(api.inventory.getStockHistory, {
      token: adminToken,
      productId,
    });
    const deliveryMovement = movements.find((m) => m.quantity === 100 && m.type === "stock_in");
    expect(deliveryMovement).toBeDefined();
  });

  it("records partial and full PO payments and updates paymentStatus accurately", async () => {
    const productId = await t.mutation(api.inventory.createProduct, {
      token: adminToken,
      sku: "SKU-ENERGY-DRINK",
      name: "Energy Drink 250ml",
      unit: "pcs",
      costPrice: 120,
      sellingPrice: 180,
      reorderPoint: 25,
      safetyStock: 5,
      trackBatches: false,
      categoryId,
      primarySupplierId: supplierId,
      initialLocationId: warehouseId,
      initialQuantity: 50,
    });

    // PO total: 50 * 120 = 6000
    const { poId } = await t.mutation(api.purchaseOrders.createPurchaseOrder, {
      token: adminToken,
      supplierId,
      lineItems: [{ productId, quantityOrdered: 50, unitCost: 120 }],
      paymentMethod: "CASH_ON_DELIVERY",
    });

    expect(poId).toBeDefined();

    // 1. Partial payment: 2500 out of 6000
    await t.mutation(api.purchaseOrders.recordPOPayment, {
      token: adminToken,
      poId: poId!,
      amount: 2500,
      method: "CASH_ON_DELIVERY",
      reference: "TXN-COD-001",
    });

    let po = await t.query(api.purchaseOrders.getPODetail, {
      token: adminToken,
      poId: poId!,
    });
    expect(po?.paymentStatus).toBe("PARTIALLY_PAID");
    expect(po?.amountPaid).toBe(2500);

    // 2. Remaining payment: 3500 (total = 6000)
    await t.mutation(api.purchaseOrders.recordPOPayment, {
      token: adminToken,
      poId: poId!,
      amount: 3500,
      method: "CASH_ON_DELIVERY",
      reference: "TXN-COD-002",
    });

    po = await t.query(api.purchaseOrders.getPODetail, {
      token: adminToken,
      poId: poId!,
    });
    expect(po?.paymentStatus).toBe("PAID");
    expect(po?.amountPaid).toBe(6000);
  });

  it("prevents duplicate reorder suggestions for the same product on repeated cron runs and deduplicates views", async () => {
    // 1. Create a product with low stock
    const productId = await t.mutation(api.inventory.createProduct, {
      token: adminToken,
      sku: "SKU-GTAV",
      name: "GTA V Game",
      unit: "pcs",
      costPrice: 2500,
      sellingPrice: 3500,
      reorderPoint: 20,
      safetyStock: 5,
      trackBatches: false,
      categoryId,
      primarySupplierId: supplierId,
      initialLocationId: warehouseId,
      initialQuantity: 3,
    });

    // 2. First generation run: creates 1 suggestion
    const firstRun = await t.mutation(api.reorder.generateReorderSuggestionsPublic, {
      token: adminToken,
    });
    expect(firstRun.created).toBe(1);

    // 3. Second generation run (like the next night): should skip because pending suggestion exists
    const secondRun = await t.mutation(api.reorder.generateReorderSuggestionsPublic, {
      token: adminToken,
    });
    expect(secondRun.created).toBe(0);

    // 4. Manually insert older duplicate suggestions (simulating past bug where daily crons created duplicates)
    await t.run(async (ctx) => {
      // Duplicate 1 (Oct 16)
      await ctx.db.insert("reorderSuggestions", {
        orgId,
        productId,
        preferredSupplierId: supplierId,
        urgency: "critical",
        suggestedQuantity: 37,
        estimatedCost: 37 * 2500,
        orderByDate: Date.now() - 2 * 86400000,
        rationale: "Automated reorder suggestion",
        status: "pending",
        aiGenerated: true,
        createdAt: Date.now() - 2 * 86400000,
      });
      // Duplicate 2 (Oct 17)
      await ctx.db.insert("reorderSuggestions", {
        orgId,
        productId,
        preferredSupplierId: supplierId,
        urgency: "critical",
        suggestedQuantity: 37,
        estimatedCost: 37 * 2500,
        orderByDate: Date.now() - 1 * 86400000,
        rationale: "Automated reorder suggestion",
        status: "pending",
        aiGenerated: true,
        createdAt: Date.now() - 1 * 86400000,
      });
    });

    // 5. Query suggestions: must return only 1 deduplicated card for this product
    const suggestions = await t.query(api.reorder.getReorderSuggestions, {
      token: adminToken,
      status: "pending",
    });
    const gtaSuggestions = suggestions.filter((s) => s.productId === productId);
    expect(gtaSuggestions.length).toBe(1);

    // 6. Query stats: pending count must reflect unique products (1), not 3
    const stats = await t.query(api.reorder.getReorderStats, {
      token: adminToken,
    });
    expect(stats.pending).toBe(1);
    expect(stats.critical).toBe(1);

    // 7. Cleanup mutation should remove the 2 older duplicates from DB
    const cleanupRes = await t.mutation(api.reorder.cleanupDuplicateSuggestions, {
      token: adminToken,
    });
    expect(cleanupRes.cleaned).toBe(2);

    // 8. Re-query the active suggestion after cleanup and approve it
    const activeSuggestions = await t.query(api.reorder.getReorderSuggestions, {
      token: adminToken,
      status: "pending",
    });
    const activeGta = activeSuggestions.find((s) => s.productId === productId);
    expect(activeGta).toBeDefined();

    await t.mutation(api.reorder.approveSuggestion, {
      token: adminToken,
      suggestionId: activeGta!._id,
      supplierId,
      quantity: 37,
      unitCost: 2500,
      paymentMethod: "CASH_ON_DELIVERY",
    });

    // 9. Re-run generator while PO is active (draft) -> should NOT create new suggestion
    const thirdRun = await t.mutation(api.reorder.generateReorderSuggestionsPublic, {
      token: adminToken,
    });
    expect(thirdRun.created).toBe(0);
  });
});
