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

export const getStockInFormData = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const [products, categories, inventories, locations] = await Promise.all([
      ctx.db.query("products").collect(),
      ctx.db.query("categories").collect(),
      ctx.db.query("inventory").collect(),
      ctx.db.query("locations").collect(),
    ]);

    const categoryMap = new Map(categories.map((category) => [category._id, category]));
    const totalsByProduct = new Map<
      string,
      { onHand: number; reserved: number; available: number }
    >();

    for (const inventory of inventories) {
      const current = totalsByProduct.get(inventory.productId) ?? {
        onHand: 0,
        reserved: 0,
        available: 0,
      };

      current.onHand += inventory.onHand;
      current.reserved += inventory.reserved;
      current.available += inventory.available;
      totalsByProduct.set(inventory.productId, current);
    }

    return {
      products: products
        .filter((product) => product.isActive)
        .map((product) => {
          const totals = totalsByProduct.get(product._id) ?? {
            onHand: 0,
            reserved: 0,
            available: 0,
          };
          const status = calcStatus(
            totals.onHand,
            product.reorderPoint,
            product.safetyStock,
          );

          return {
            _id: product._id,
            sku: product.sku,
            name: product.name,
            unit: product.unit,
            categoryName: product.categoryId
              ? categoryMap.get(product.categoryId)?.name ?? "Uncategorized"
              : "Uncategorized",
            reorderPoint: product.reorderPoint,
            safetyStock: product.safetyStock,
            trackBatches: product.trackBatches,
            onHand: totals.onHand,
            available: totals.available,
            status,
            stockPct: calcStockPct(totals.onHand, product.reorderPoint),
          };
        })
        .sort((left, right) => left.name.localeCompare(right.name)),
      locations: locations
        .filter((location) => location.isActive)
        .map((location) => ({
          _id: location._id,
          name: location.name,
          type: location.type,
          address: location.address,
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    };
  },
});

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("categories")
      .collect()
      .then((categories) =>
        categories
          .map((category) => ({
            _id: category._id,
            name: category.name,
          }))
          .sort((left, right) => left.name.localeCompare(right.name)),
      );
  },
});

export const getSuppliers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("suppliers")
      .collect()
      .then((suppliers) =>
        suppliers
          .filter((supplier) => supplier.isActive)
          .map((supplier) => ({
            _id: supplier._id,
            name: supplier.name,
          }))
          .sort((left, right) => left.name.localeCompare(right.name)),
      );
  },
});

export const getStockControlFormData = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const [products, locations, inventory] = await Promise.all([
      ctx.db.query("products").collect(),
      ctx.db.query("locations").collect(),
      ctx.db.query("inventory").collect(),
    ]);

    return {
      products: products
        .filter((product) => product.isActive)
        .map((product) => ({
          _id: product._id,
          sku: product.sku,
          name: product.name,
          unit: product.unit,
          reorderPoint: product.reorderPoint,
          safetyStock: product.safetyStock,
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
      locations: locations
        .filter((location) => location.isActive)
        .map((location) => ({
          _id: location._id,
          name: location.name,
          type: location.type,
          address: location.address,
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
      inventory: inventory.map((entry) => ({
        _id: entry._id,
        productId: entry.productId,
        locationId: entry.locationId,
        onHand: entry.onHand,
        reserved: entry.reserved,
        available: entry.available,
        lastUpdated: entry.lastUpdated,
      })),
    };
  },
});

// Return next SKU based on existing products with format PREFIX-NUM (e.g. SKU-1500)
export const getNextSku = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    let max = 0;
    for (const p of products) {
      if (!p.sku) continue;
      const m = p.sku.match(/(\d+)$/);
      if (!m) continue;
      const n = Number(m[1]);
      if (!Number.isNaN(n) && n > max) max = n;
    }
    const next = max + 1;
    return `SKU-${next}`;
  },
});

// getInventoryStats — same fix
export const getInventoryStats = query({
  args: {},
  handler: async (ctx) => {
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

// Full product update for the edit page (admin/manager)
export const editProduct = mutation({
  args: {
    productId: v.id("products"),
    sku: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    unit: v.optional(v.string()),
    costPrice: v.optional(v.number()),
    sellingPrice: v.optional(v.number()),
    reorderPoint: v.optional(v.number()),
    safetyStock: v.optional(v.number()),
    categoryId: v.optional(v.id("categories")),
    primarySupplierId: v.optional(v.id("suppliers")),
    trackBatches: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !["admin", "manager"].includes(user.role)) {
      throw new Error("Access denied");
    }

    const { productId, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(productId, cleanUpdates);

    return { success: true };
  },
});

// Delete product and related inventory/movements (admin/manager)
export const deleteProduct = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !["admin", "manager"].includes(user.role)) {
      throw new Error("Access denied");
    }

    // Remove inventory records
    const inventories = await ctx.db
      .query("inventory")
      .withIndex("by_product", q => q.eq("productId", args.productId))
      .collect();

    for (const inv of inventories) {
      await ctx.db.delete(inv._id);
    }

    // Remove stock movements
    const movements = await ctx.db
      .query("stockMovements")
      .withIndex("by_product_date", q => q.eq("productId", args.productId))
      .collect();

    for (const m of movements) {
      await ctx.db.delete(m._id);
    }

    // Finally remove product
    await ctx.db.delete(args.productId);

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

    const inv = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) =>
        q
          .eq("productId", args.productId)
          .eq("locationId", args.locationId),
      )
      .first();

    const newOnHand = (inv?.onHand ?? 0) + args.quantity;

    if (inv) {
      await ctx.db.patch(inv._id, {
        onHand: newOnHand,
        available: newOnHand - inv.reserved,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("inventory", {
        productId: args.productId,
        locationId: args.locationId,
        onHand: newOnHand,
        reserved: 0,
        available: newOnHand,
        lastUpdated: Date.now(),
      });
    }

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
      userId:     user?._id,
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

// ── Create Product (admin/manager) ─────────────────────────
export const createProduct = mutation({
  args: {
    sku: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    unit: v.union(v.literal("pcs"), v.literal("kg"), v.literal("litre"), v.literal("box"), v.literal("ml")),
    costPrice: v.number(),
    sellingPrice: v.number(),
    reorderPoint: v.number(),
    safetyStock: v.number(),
    categoryId: v.optional(v.id("categories")),
    primarySupplierId: v.optional(v.id("suppliers")),
    trackBatches: v.optional(v.boolean()),
    initialLocationId: v.optional(v.id("locations")),
    initialQuantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !["admin", "manager"].includes(user.role)) {
      throw new Error("Access denied");
    }

    const product = {
      categoryId: args.categoryId,
      primarySupplierId: args.primarySupplierId,
      sku: args.sku,
      name: args.name,
      description: args.description,
      unit: args.unit,
      costPrice: args.costPrice,
      sellingPrice: args.sellingPrice,
      reorderPoint: args.reorderPoint,
      safetyStock: args.safetyStock,
      trackBatches: args.trackBatches ?? false,
      isActive: true,
      createdAt: Date.now(),
    };

    const id = await ctx.db.insert("products", product);

    // Optionally create initial inventory record (inline logic copied from recordStockIn)
    if (args.initialLocationId && args.initialQuantity && args.initialQuantity > 0) {
      const inv = await ctx.db
        .query("inventory")
        .withIndex("by_product_location", (q) =>
          q.eq("productId", id).eq("locationId", args.initialLocationId!),
        )
        .first();

      const newOnHand = (inv?.onHand ?? 0) + args.initialQuantity;

      if (inv) {
        await ctx.db.patch(inv._id, {
          onHand: newOnHand,
          available: newOnHand - inv.reserved,
          lastUpdated: Date.now(),
        });
      } else {
        await ctx.db.insert("inventory", {
          productId: id,
          locationId: args.initialLocationId!,
          onHand: newOnHand,
          reserved: 0,
          available: newOnHand,
          lastUpdated: Date.now(),
        });
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
        .first();

      await ctx.db.insert("stockMovements", {
        productId: id,
        locationId: args.initialLocationId!,
        userId: user?._id,
        type: "stock_in",
        reason: "Initial stock",
        quantity: args.initialQuantity,
        createdAt: Date.now(),
      });
    }

    return id;
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

    // ── AUTO REORDER CHECK ──────────────────────
    const product = await ctx.db.get(args.productId);

    if (product && newOnHand < product.reorderPoint) {

      // Already pending suggestion irukka check
      const existing = await ctx.db
        .query("reorderSuggestions")
        .withIndex("by_product", q =>
          q.eq("productId", args.productId)
        )
        .filter(q => q.eq(q.field("status"), "pending"))
        .first();

      // Illana — new suggestion create pannu
      if (!existing) {
        let urgency: "critical" | "high" | "medium" | "low";
        let rationale = "";

        if (newOnHand <= product.safetyStock) {
          urgency   = "critical";
          rationale = `Stock (${newOnHand} units) dropped below safety stock (${product.safetyStock} units). Immediate reorder required.`;
        } else if (newOnHand <= product.reorderPoint * 0.5) {
          urgency   = "high";
          rationale = `Stock (${newOnHand} units) is below 50% of reorder point (${product.reorderPoint} units). Reorder urgently.`;
        } else {
          urgency   = "medium";
          rationale = `Stock (${newOnHand} units) fell below reorder point (${product.reorderPoint} units). Schedule a reorder.`;
        }

        const suggestedQty  = Math.max(
          product.reorderPoint * 3 - newOnHand,
          product.reorderPoint
        );

        const orderByDate = Date.now() + (
          urgency === "critical" ? 1 :
          urgency === "high"     ? 3 : 7
        ) * 24 * 60 * 60 * 1000;

        await ctx.db.insert("reorderSuggestions", {
          productId:           args.productId,
          preferredSupplierId: product.primarySupplierId,
          urgency,
          suggestedQuantity:   suggestedQty,
          estimatedCost:       suggestedQty * product.costPrice,
          orderByDate,
          rationale,
          status:              "pending",
          aiGenerated:         false,
          createdAt:           Date.now(),
        });

        // Alert also create pannu
        await ctx.db.insert("alerts", {
          productId:   args.productId,
          type:        urgency === "critical" ? "critical_stock" : "low_stock",
          priority:    urgency,
          message:     `${product.name} — ${rationale}`,
          isRead:      false,
          isDismissed: false,
          createdAt:   Date.now(),
        });
      }
    }

    return { success: true, newOnHand };
  },
});


export const getStockOutFormData = query({
  args: {},
  handler: async (ctx) => {
    const allInventory = await ctx.db
      .query("inventory")
      .collect();

    const locations = await ctx.db
      .query("locations")
      .collect();

    const productsWithStock = await Promise.all(
      allInventory.map(async (inv) => {
        const product = await ctx.db.get(inv.productId);
        if (!product || !product.isActive) return null;

        return {
          _id:        product._id,
          sku:        product.sku,
          name:       product.name,
          unit:       product.unit,
          onHand:     inv.onHand,
          reserved:   inv.reserved,
          available:  inv.available,
          locationId: inv.locationId as string,
        };
      })
    );

    // Filter nulls with type guard
    const filtered = productsWithStock
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .filter(p => p.onHand > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      products:  filtered,
      locations: locations.filter(l => l.isActive),
    };
  },
});

export const recordStockAdjustment = mutation({
  args: {
    productId: v.id("products"),
    locationId: v.id("locations"),
    adjustedOnHand: v.number(),
    reason: v.optional(v.string()),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    if (args.adjustedOnHand < 0) {
      throw new Error("Adjusted stock cannot be negative.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !["admin", "manager"].includes(user.role)) {
      throw new Error("Access denied");
    }

    const inv = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) =>
        q.eq("productId", args.productId).eq("locationId", args.locationId),
      )
      .first();

    const currentOnHand = inv?.onHand ?? 0;
    const delta = args.adjustedOnHand - currentOnHand;
    if (delta === 0) {
      throw new Error("No adjustment detected. Current and adjusted stock are the same.");
    }

    if (inv) {
      await ctx.db.patch(inv._id, {
        onHand: args.adjustedOnHand,
        available: args.adjustedOnHand - inv.reserved,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("inventory", {
        productId: args.productId,
        locationId: args.locationId,
        onHand: args.adjustedOnHand,
        reserved: 0,
        available: args.adjustedOnHand,
        lastUpdated: Date.now(),
      });
    }

    await ctx.db.insert("stockMovements", {
      productId: args.productId,
      locationId: args.locationId,
      userId: user._id,
      type: "adjustment",
      reason: args.reason ?? "Manual stock adjustment",
      quantity: delta,
      reference: args.reference,
      notes: args.notes,
      createdAt: Date.now(),
    });

    return {
      success: true,
      previousOnHand: currentOnHand,
      adjustedOnHand: args.adjustedOnHand,
      delta,
    };
  },
});

export const transferStockBetweenLocations = mutation({
  args: {
    productId: v.id("products"),
    fromLocationId: v.id("locations"),
    toLocationId: v.id("locations"),
    quantity: v.number(),
    reason: v.optional(v.string()),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    if (args.fromLocationId === args.toLocationId) {
      throw new Error("Source and destination locations must be different.");
    }

    if (args.quantity <= 0) {
      throw new Error("Transfer quantity must be greater than zero.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !["admin", "manager"].includes(user.role)) {
      throw new Error("Access denied");
    }

    const sourceInventory = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) =>
        q.eq("productId", args.productId).eq("locationId", args.fromLocationId),
      )
      .first();

    if (!sourceInventory) {
      throw new Error("Source inventory record not found.");
    }

    if (sourceInventory.available < args.quantity) {
      throw new Error(
        `Insufficient stock at source. Available: ${sourceInventory.available} units.`,
      );
    }

    const destinationInventory = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) =>
        q.eq("productId", args.productId).eq("locationId", args.toLocationId),
      )
      .first();

    const sourceNewOnHand = sourceInventory.onHand - args.quantity;
    await ctx.db.patch(sourceInventory._id, {
      onHand: sourceNewOnHand,
      available: sourceNewOnHand - sourceInventory.reserved,
      lastUpdated: Date.now(),
    });

    let destinationNewOnHand = args.quantity;
    if (destinationInventory) {
      destinationNewOnHand = destinationInventory.onHand + args.quantity;
      await ctx.db.patch(destinationInventory._id, {
        onHand: destinationNewOnHand,
        available: destinationNewOnHand - destinationInventory.reserved,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("inventory", {
        productId: args.productId,
        locationId: args.toLocationId,
        onHand: destinationNewOnHand,
        reserved: 0,
        available: destinationNewOnHand,
        lastUpdated: Date.now(),
      });
    }

    const reason = args.reason ?? "Stock transfer";

    await ctx.db.insert("stockMovements", {
      productId: args.productId,
      locationId: args.fromLocationId,
      userId: user._id,
      type: "transfer_out",
      reason,
      quantity: -args.quantity,
      reference: args.reference,
      notes: args.notes,
      createdAt: Date.now(),
    });

    await ctx.db.insert("stockMovements", {
      productId: args.productId,
      locationId: args.toLocationId,
      userId: user._id,
      type: "transfer_in",
      reason,
      quantity: args.quantity,
      reference: args.reference,
      notes: args.notes,
      createdAt: Date.now(),
    });

    return {
      success: true,
      sourceNewOnHand,
      destinationNewOnHand,
    };
  },
});
