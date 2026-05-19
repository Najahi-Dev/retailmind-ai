// convex/inventory.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ── Stock Status Helper ───────────────────────────
function calcStatus(
  onHand:       number,
  reorderPoint: number,
  safetyStock:  number
): "critical" | "low" | "healthy" | "overstock" {
  if (onHand <= safetyStock)        return "critical";
  if (onHand <= reorderPoint)       return "low";
  if (onHand >= reorderPoint * 5)   return "overstock";
  return "healthy";
}

function calcStockPct(onHand: number, reorderPoint: number): number {
  if (reorderPoint === 0) return 100;
  return Math.min(100, Math.round((onHand / (reorderPoint * 5)) * 100));
}

// ── Inventory Overview ────────────────────────────
export const getInventoryOverview = query({
  args: {},
  handler: async (ctx) => {
    // ✅ Fix — throw pannaadha, null return pannu
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];  // ← throw illai, empty array return

    const [inventoryRecords, products, categories, locations] =
      await Promise.all([
        ctx.db.query("inventory").collect(),
        ctx.db.query("products").collect(),
        ctx.db.query("categories").collect(),
        ctx.db.query("locations").collect(),
      ]);

    const productMap  = new Map(products.map(p  => [p._id, p]));
    const categoryMap = new Map(categories.map(c => [c._id, c]));
    const locationMap = new Map(locations.map(l  => [l._id, l]));

    return inventoryRecords
      .map((inv) => {
        const product = productMap.get(inv.productId);
        if (!product || !product.isActive) return null;

        const category = product.categoryId
          ? categoryMap.get(product.categoryId)
          : null;
        const location = locationMap.get(inv.locationId);

        const status   = calcStatus(
          inv.onHand,
          product.reorderPoint,
          product.safetyStock
        );
        const stockPct = calcStockPct(
          inv.onHand,
          product.reorderPoint
        );

        return {
          inventoryId:  inv._id,
          productId:    product._id,
          sku:          product.sku,
          name:         product.name,
          category:     category?.name  ?? "Uncategorized",
          location:     location?.name  ?? "Unknown",
          unit:         product.unit,
          onHand:       inv.onHand,
          reserved:     inv.reserved,
          available:    inv.available,
          reorderPoint: product.reorderPoint,
          safetyStock:  product.safetyStock,
          costPrice:    product.costPrice,
          sellingPrice: product.sellingPrice,
          stockValue:   inv.onHand * product.costPrice,
          stockPct,
          status,
          lastUpdated:  inv.lastUpdated,
        };
      })
      .filter(Boolean);
  },
});

// getInventoryStats — same fix
export const getInventoryStats = query({
  args: {},
  handler: async (ctx) => {
    // ✅ Fix — null return pannu
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;  // ← throw illai, null return

    const [inventoryRecords, products] = await Promise.all([
      ctx.db.query("inventory").collect(),
      ctx.db.query("products").collect(),
    ]);

    const productMap = new Map(products.map(p => [p._id, p]));

    let totalValue     = 0;
    let criticalCount  = 0;
    let lowCount       = 0;
    let overstockCount = 0;
    let healthyCount   = 0;

    for (const inv of inventoryRecords) {
      const product = productMap.get(inv.productId);
      if (!product || !product.isActive) continue;

      totalValue += inv.onHand * product.costPrice;

      const status = calcStatus(
        inv.onHand,
        product.reorderPoint,
        product.safetyStock
      );

      if (status === "critical")  criticalCount++;
      if (status === "low")       lowCount++;
      if (status === "overstock") overstockCount++;
      if (status === "healthy")   healthyCount++;
    }

    return {
      totalProducts: products.filter(p => p.isActive).length,
      totalValue:    Math.round(totalValue * 100) / 100,
      criticalCount,
      lowCount,
      overstockCount,
      healthyCount,
    };
  },
});

// getProductDetail — same fix
export const getProductDetail = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;  // ← throw illai

    const product = await ctx.db.get(args.productId);
    if (!product) return null;

    const category = product.categoryId
      ? await ctx.db.get(product.categoryId)
      : null;
    const supplier = product.primarySupplierId
      ? await ctx.db.get(product.primarySupplierId)
      : null;
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_product", q =>
        q.eq("productId", args.productId)
      )
      .first();
    const location = inventory?.locationId
      ? await ctx.db.get(inventory.locationId)
      : null;

    const status = inventory
      ? calcStatus(
          inventory.onHand,
          product.reorderPoint,
          product.safetyStock
        )
      : "healthy" as const;

    return { product, category, supplier, inventory, location, status };
  },
});

// getStockHistory — same fix
export const getStockHistory = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];  // ← throw illai

    const movements = await ctx.db
      .query("stockMovements")
      .withIndex("by_product_date", q =>
        q.eq("productId", args.productId)
      )
      .order("desc")
      .take(100);

    return await Promise.all(
      movements.map(async (m) => {
        const location = await ctx.db.get(m.locationId);
        const user     = m.userId
          ? await ctx.db.get(m.userId)
          : null;
        return {
          ...m,
          locationName: location?.name,
          userName:     user?.name,
        };
      })
    );
  },
});

// getProductPurchaseOrders — same fix
export const getProductPurchaseOrders = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const allPOs = await ctx.db
      .query("purchaseOrders")
      .order("desc")
      .take(200);

    const related = allPOs.filter(po =>
      po.lineItems.some(line => line.productId === args.productId)
    );

    return await Promise.all(
      related.slice(0, 20).map(async (po) => {
        const supplier = await ctx.db.get(po.supplierId);
        const line     = po.lineItems.find(
          l => l.productId === args.productId
        );
        return {
          ...po,
          supplierName: supplier?.name ?? "Unknown",
          lineQty:      line?.quantityOrdered ?? 0,
          lineUnitCost: line?.unitCost        ?? 0,
        };
      })
    );
  },
});

// getProductForecasts — same fix
export const getProductForecasts = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("forecasts")
      .withIndex("by_product", q =>
        q.eq("productId", args.productId)
      )
      .order("asc")
      .take(30);
  },
});

export const updateProduct = mutation({
  args: {
    productId:    v.id("products"),
    reorderPoint: v.optional(v.number()),
    safetyStock:  v.optional(v.number()),
    costPrice:    v.optional(v.number()),
    sellingPrice: v.optional(v.number()),
    trackBatches: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Role check — admin and manager only
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user || !["admin", "manager"].includes(user.role)) {
      throw new Error("Access denied");
    }

    const { productId, ...updates } = args;

    // Remove undefined fields
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(productId, cleanUpdates);

    return { success: true };
  },
});

// ── Single Product Inventory ──────────────────────
export const getProductInventory = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const inv = await ctx.db
      .query("inventory")
      .withIndex("by_product", q =>
        q.eq("productId", args.productId)
      )
      .first();

    if (!inv) return null;

    const [product, location] = await Promise.all([
      ctx.db.get(inv.productId),
      ctx.db.get(inv.locationId),
    ]);

    const category = product?.categoryId
      ? await ctx.db.get(product.categoryId)
      : null;

    const supplier = product?.primarySupplierId
      ? await ctx.db.get(product.primarySupplierId)
      : null;

    if (!product) return null;

    const status   = calcStatus(
      inv.onHand,
      product.reorderPoint,
      product.safetyStock
    );
    const stockPct = calcStockPct(
      inv.onHand,
      product.reorderPoint
    );

    return {
      inventoryId:  inv._id,
      productId:    product._id,
      sku:          product.sku,
      name:         product.name,
      description:  product.description,
      unit:         product.unit,
      category:     category?.name  ?? "Uncategorized",
      categoryId:   category?._id,
      supplier:     supplier?.name  ?? "Unknown",
      supplierId:   supplier?._id,
      location:     location?.name  ?? "Unknown",
      locationId:   location?._id,
      onHand:       inv.onHand,
      reserved:     inv.reserved,
      available:    inv.available,
      reorderPoint: product.reorderPoint,
      safetyStock:  product.safetyStock,
      costPrice:    product.costPrice,
      sellingPrice: product.sellingPrice,
      stockValue:   inv.onHand * product.costPrice,
      stockPct,
      status,
      lastUpdated:  inv.lastUpdated,
      trackBatches: product.trackBatches,
    };
  },
});

// ── Record Stock-In ───────────────────────────────
export const recordStockIn = mutation({
  args: {
    productId:  v.id("products"),
    locationId: v.id("locations"),
    quantity:   v.number(),
    reason:     v.optional(v.string()),
    lotNumber:  v.optional(v.string()),
    reference:  v.optional(v.string()),
    notes:      v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    if (args.quantity <= 0) {
      throw new Error("Quantity must be greater than zero.");
    }

    // Get current inventory
    const inv = await ctx.db
      .query("inventory")
      .withIndex("by_product", q =>
        q.eq("productId", args.productId)
      )
      .first();

    if (!inv) throw new Error("Inventory record not found.");

    const newOnHand = inv.onHand + args.quantity;

    // Update inventory
    await ctx.db.patch(inv._id, {
      onHand:      newOnHand,
      available:   newOnHand - inv.reserved,
      lastUpdated: Date.now(),
    });

    // Get user from Convex
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    // Audit log
    await ctx.db.insert("stockMovements", {
      productId:  args.productId,
      locationId: args.locationId,
      userId:     user!._id,
      type:       "stock_in",
      reason:     args.reason ?? "Restock",
      quantity:   args.quantity,
      lotNumber:  args.lotNumber,
      reference:  args.reference,
      notes:      args.notes,
      createdAt:  Date.now(),
    });

    return { success: true, newOnHand };
  },
});

// ── Record Stock-Out ──────────────────────────────
export const recordStockOut = mutation({
  args: {
    productId:  v.id("products"),
    locationId: v.id("locations"),
    quantity:   v.number(),
    reason:     v.optional(v.string()),
    reference:  v.optional(v.string()),
    notes:      v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    if (args.quantity <= 0) {
      throw new Error("Quantity must be greater than zero.");
    }

    const inv = await ctx.db
      .query("inventory")
      .withIndex("by_product", q =>
        q.eq("productId", args.productId)
      )
      .first();

    if (!inv) throw new Error("Inventory record not found.");

    // Sufficient stock check
    if (inv.available < args.quantity) {
      throw new Error(
        `Insufficient stock. Available: ${inv.available} units.`
      );
    }

    const newOnHand = inv.onHand - args.quantity;

    // Update inventory
    await ctx.db.patch(inv._id, {
      onHand:      newOnHand,
      available:   newOnHand - inv.reserved,
      lastUpdated: Date.now(),
    });

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    // Audit log
    await ctx.db.insert("stockMovements", {
      productId:  args.productId,
      locationId: args.locationId,
      userId:     user!._id,
      type:       "stock_out",
      reason:     args.reason ?? "Sale",
      quantity:   -args.quantity,
      reference:  args.reference,
      notes:      args.notes,
      createdAt:  Date.now(),
    });

    // Auto alert if below reorder point
    const product = await ctx.db.get(args.productId);
    if (product && newOnHand <= product.reorderPoint) {
      const priority = newOnHand <= product.safetyStock
        ? "critical"
        : "high";

      await ctx.db.insert("alerts", {
        productId:   args.productId,
        type:        newOnHand <= product.safetyStock
          ? "critical_stock"
          : "low_stock",
        priority,
        message:     `${product.name} stock is ${priority === "critical" ? "critically" : ""} low. Only ${newOnHand} units remaining.`,
        isRead:      false,
        isDismissed: false,
        createdAt:   Date.now(),
      });
    }

    return { success: true, newOnHand };
  },
});
