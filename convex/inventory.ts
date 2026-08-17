// convex/inventory.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getCallerUser, requireCallerOrg } from "./lib/roleGuard";

// ── Stock Status Helper ───────────────────────────
function calcStatus(
  onHand: number,
  reorderPoint: number,
  safetyStock: number
): "critical" | "low" | "healthy" | "overstock" {
  if (onHand <= safetyStock) return "critical";
  if (onHand <= reorderPoint) return "low";
  if (onHand >= reorderPoint * 3) return "overstock";
  return "healthy";
}

function calcStockPct(onHand: number, reorderPoint: number): number {
  if (reorderPoint <= 0) return onHand > 0 ? 100 : 0;
  const targetOptimalStock = reorderPoint * 2;
  return Math.min(100, Math.max(0, Math.round((onHand / targetOptimalStock) * 100)));
}

// Get all products scoped by organization
export const getProducts = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args?.token);
    const products = await ctx.db.query("products").collect();
    if (!caller || !caller.orgId) return [];
    return products.filter((p) => p.orgId === caller.orgId);
  },
});

// ── Inventory Overview ────────────────────────────
export const getInventoryOverview = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args?.token);
    if (!caller || !caller.orgId) return [];
    const orgId = caller.orgId;

    const [allInventory, allProducts, allCategories, allLocations] =
      await Promise.all([
        ctx.db.query("inventory").collect(),
        ctx.db.query("products").collect(),
        ctx.db.query("categories").collect(),
        ctx.db.query("locations").collect(),
      ]);

    const inventoryRecords = allInventory.filter((i) => i.orgId === orgId);
    const products = allProducts.filter((p) => p.orgId === orgId);
    const categories = allCategories.filter((c) => c.orgId === orgId);
    const locations = allLocations.filter((l) => l.orgId === orgId);

    const productMap = new Map(products.map((p) => [p._id, p]));
    const categoryMap = new Map(categories.map((c) => [c._id, c]));
    const locationMap = new Map(locations.map((l) => [l._id, l]));

    return inventoryRecords
      .map((inv) => {
        const product = productMap.get(inv.productId);
        if (!product || !product.isActive) return null;

        const category = product.categoryId
          ? categoryMap.get(product.categoryId)
          : null;
        const location = locationMap.get(inv.locationId);

        const status = calcStatus(
          inv.onHand,
          product.reorderPoint,
          product.safetyStock
        );
        const stockPct = calcStockPct(inv.onHand, product.reorderPoint);

        return {
          inventoryId: inv._id,
          productId: product._id,
          sku: product.sku,
          name: product.name,
          category: category?.name ?? "Uncategorized",
          location: location?.name ?? "Unknown",
          unit: product.unit,
          onHand: inv.onHand,
          reserved: inv.reserved,
          available: inv.available,
          reorderPoint: product.reorderPoint,
          safetyStock: product.safetyStock,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          stockValue: inv.onHand * product.costPrice,
          stockPct,
          status,
          lastUpdated: inv.lastUpdated,
        };
      })
      .filter(Boolean);
  },
});

export const getStockInFormData = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args?.token);
    if (!caller || !caller.orgId) return { products: [], locations: [] };
    const orgId = caller.orgId;

    const [allProducts, allCategories, allInventories, allLocations] = await Promise.all([
      ctx.db.query("products").collect(),
      ctx.db.query("categories").collect(),
      ctx.db.query("inventory").collect(),
      ctx.db.query("locations").collect(),
    ]);

    const products = allProducts.filter((p) => p.orgId === orgId);
    const categories = allCategories.filter((c) => c.orgId === orgId);
    const inventories = allInventories.filter((i) => i.orgId === orgId);
    const locations = allLocations.filter((l) => l.orgId === orgId);

    const categoryMap = new Map(categories.map((category) => [category._id, category]));
    const totalsByProduct = new Map<
      string,
      { onHand: number; reserved: number; available: number; locationId?: Id<"locations"> }
    >();

    for (const inventory of inventories) {
      const current = totalsByProduct.get(inventory.productId) ?? {
        onHand: 0,
        reserved: 0,
        available: 0,
        locationId: inventory.locationId,
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
            locationId: totals.locationId,
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
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args?.token);
    if (!caller || !caller.orgId) return [];
    const categories = await ctx.db.query("categories").collect();
    return categories
      .filter((c) => c.orgId === caller.orgId)
      .map((c) => ({
        _id: c._id,
        name: c.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

// ── addCategory mutation (upsert by name) ──
export const addCategory = mutation({
  args: {
    token: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    const trimmedName = args.name.trim();
    if (!trimmedName) throw new Error("Category name is required");

    // Check for existing category with same name (case-insensitive)
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    const duplicate = existing.find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) return duplicate._id;

    const id = await ctx.db.insert("categories", {
      orgId,
      name: trimmedName,
      description: args.description?.trim() || undefined,
      createdAt: Date.now(),
    });
    return id;
  },
});

// ── addLocation mutation (upsert by name) ──
export const addLocation = mutation({
  args: {
    token: v.optional(v.string()),
    name: v.string(),
    address: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("warehouse"),
      v.literal("store"),
      v.literal("distribution_center"),
      v.literal("supplier_site"),
    )),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    const trimmedName = args.name.trim();
    if (!trimmedName) throw new Error("Location name is required");

    // Check for existing location with same name (case-insensitive)
    const existing = await ctx.db
      .query("locations")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
    const duplicate = existing.find(
      (l) => l.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) return duplicate._id;

    const id = await ctx.db.insert("locations", {
      orgId,
      name: trimmedName,
      address: args.address?.trim() || undefined,
      type: args.type ?? "warehouse",
      isActive: true,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const getSuppliers = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args?.token);
    if (!caller || !caller.orgId) return [];
    const suppliers = await ctx.db.query("suppliers").collect();
    return suppliers
      .filter((s) => s.orgId === caller.orgId && s.isActive)
      .map((s) => ({
        _id: s._id,
        name: s.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const getStockControlFormData = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args?.token);
    if (!caller || !caller.orgId) return { products: [], locations: [], inventory: [] };
    const orgId = caller.orgId;

    const [allProducts, allLocations, allInventory] = await Promise.all([
      ctx.db.query("products").collect(),
      ctx.db.query("locations").collect(),
      ctx.db.query("inventory").collect(),
    ]);

    const products = allProducts.filter((p) => p.orgId === orgId);
    const locations = allLocations.filter((l) => l.orgId === orgId);
    const inventory = allInventory.filter((i) => i.orgId === orgId);

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

export const getNextSku = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args?.token);
    const allProducts = await ctx.db.query("products").collect();
    const products = caller && caller.orgId ? allProducts.filter((p) => p.orgId === caller.orgId) : allProducts;

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

export const getInventoryStats = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args?.token);
    if (!caller || !caller.orgId) {
      return {
        totalProducts: 0,
        totalValue: 0,
        criticalCount: 0,
        lowCount: 0,
        overstockCount: 0,
        healthyCount: 0,
      };
    }
    const orgId = caller.orgId;

    const [allInventory, allProducts] = await Promise.all([
      ctx.db.query("inventory").collect(),
      ctx.db.query("products").collect(),
    ]);

    const inventoryRecords = allInventory.filter((i) => i.orgId === orgId);
    const products = allProducts.filter((p) => p.orgId === orgId);

    const productMap = new Map(products.map((p) => [p._id, p]));

    let totalValue = 0;
    let criticalCount = 0;
    let lowCount = 0;
    let overstockCount = 0;
    let healthyCount = 0;

    for (const inv of inventoryRecords) {
      const product = productMap.get(inv.productId);
      if (!product || !product.isActive) continue;

      totalValue += inv.onHand * product.costPrice;

      const status = calcStatus(
        inv.onHand,
        product.reorderPoint,
        product.safetyStock
      );

      if (status === "critical") criticalCount++;
      if (status === "low") lowCount++;
      if (status === "overstock") overstockCount++;
      if (status === "healthy") healthyCount++;
    }

    return {
      totalProducts: products.filter((p) => p.isActive).length,
      totalValue: Math.round(totalValue * 100) / 100,
      criticalCount,
      lowCount,
      overstockCount,
      healthyCount,
    };
  },
});

export const getProductDetail = query({
  args: {
    productId: v.id("products"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args?.token);
    const product = await ctx.db.get(args.productId);
    if (!product) return null;

    if (caller && caller.orgId && product.orgId && product.orgId !== caller.orgId) {
      throw new Error("Access Denied: Product belongs to another workspace.");
    }

    const category = product.categoryId
      ? await ctx.db.get(product.categoryId)
      : null;
    const supplier = product.primarySupplierId
      ? await ctx.db.get(product.primarySupplierId)
      : null;
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
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
      : ("healthy" as const);

    return { product, category, supplier, inventory, location, status };
  },
});

export const getStockHistory = query({
  args: {
    productId: v.id("products"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args?.token);
    const movements = await ctx.db
      .query("stockMovements")
      .withIndex("by_product_date", (q) => q.eq("productId", args.productId))
      .order("desc")
      .take(100);

    const filtered = caller && caller.orgId ? movements.filter((m) => m.orgId === caller.orgId) : movements;

    return await Promise.all(
      filtered.map(async (m) => {
        const location = await ctx.db.get(m.locationId);
        const user = m.userId ? await ctx.db.get(m.userId) : null;
        return {
          ...m,
          locationName: location?.name,
          userName: user?.name,
        };
      })
    );
  },
});

export const getStockMovementChartData = query({
  args: {
    token: v.optional(v.string()),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args?.token);
    if (!caller || !caller.orgId) return [];

    const numDays = args.days ?? 90;
    const allMovements = await ctx.db.query("stockMovements").collect();
    const movements = allMovements.filter((m) => m.orgId === caller.orgId);

    const dataMap = new Map<string, { stockIn: number; stockOut: number }>();
    const now = new Date();

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      dataMap.set(dateStr, { stockIn: 0, stockOut: 0 });
    }

    for (const m of movements) {
      const dateStr = new Date(m.createdAt).toISOString().split("T")[0];
      if (dataMap.has(dateStr)) {
        const entry = dataMap.get(dateStr)!;
        if (m.type === "stock_in") {
          entry.stockIn += m.quantity;
        } else if (m.type === "stock_out") {
          entry.stockOut += m.quantity;
        }
      }
    }

    return Array.from(dataMap.entries()).map(([date, counts]) => ({
      date,
      stockIn: counts.stockIn,
      stockOut: counts.stockOut,
    }));
  },
});

// ── createProduct mutation ──
export const createProduct = mutation({
  args: {
    token: v.optional(v.string()),
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
    trackBatches: v.boolean(),
    initialLocationId: v.optional(v.id("locations")),
    initialQuantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user: caller, orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager", "staff"]);

    // Check SKU duplicate
    const allProducts = await ctx.db.query("products").collect();
    const existing = allProducts.find((p) => p.sku === args.sku && (!p.orgId || p.orgId === orgId));
    if (existing) {
      throw new Error(`Product with SKU '${args.sku}' already exists in your workspace.`);
    }

    // Starter Plan Usage Check: 100 SKUs limit
    const org: any = await ctx.db.get(orgId);
    const planTier = (org?.planTier ?? (org?.plan ? org.plan.toUpperCase() : "STARTER"));
    const rawStatus = (org?.subscriptionStatus ?? "FREE").toUpperCase();
    const isPaidActive = ["ACTIVE", "TRIALING", "TRIAL"].includes(rawStatus);

    if (planTier === "STARTER" || !isPaidActive) {
      const orgProducts = allProducts.filter((p) => p.orgId === orgId);
      if (orgProducts.length >= 100) {
        throw new Error("Starter Plan limit reached (100 SKUs max). Upgrade to Growth Plan for unlimited SKUs.");
      }
    }

    const productId = await ctx.db.insert("products", {
      orgId,
      sku: args.sku,
      name: args.name,
      description: args.description,
      unit: args.unit,
      costPrice: args.costPrice,
      sellingPrice: args.sellingPrice,
      reorderPoint: args.reorderPoint,
      safetyStock: args.safetyStock,
      categoryId: args.categoryId,
      primarySupplierId: args.primarySupplierId,
      trackBatches: args.trackBatches,
      isActive: true,
      createdAt: Date.now(),
    });

    if (args.initialLocationId && args.initialQuantity && args.initialQuantity > 0) {
      await ctx.db.insert("inventory", {
        orgId,
        productId,
        locationId: args.initialLocationId,
        onHand: args.initialQuantity,
        reserved: 0,
        available: args.initialQuantity,
        lastUpdated: Date.now(),
      });

      await ctx.db.insert("stockMovements", {
        orgId,
        productId,
        locationId: args.initialLocationId,
        userId: caller._id,
        type: "stock_in",
        reason: "Initial Stocking",
        quantity: args.initialQuantity,
        createdAt: Date.now(),
      });
    }

    return productId;
  },
});

// ── updateProduct mutation ──
export const updateProduct = mutation({
  args: {
    token: v.optional(v.string()),
    productId: v.id("products"),
    sku: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    unit: v.optional(v.union(v.literal("pcs"), v.literal("kg"), v.literal("litre"), v.literal("box"), v.literal("ml"))),
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
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    if (orgId && product.orgId && product.orgId !== orgId) {
      throw new Error("Access Denied: Product belongs to another workspace.");
    }

    const { productId, token, ...updates } = args;
    const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([_, val]) => val !== undefined));
    await ctx.db.patch(productId, cleanUpdates);
    return { success: true };
  },
});

export const editProduct = updateProduct;

// ── deleteProduct mutation ──
export const deleteProduct = mutation({
  args: {
    token: v.optional(v.string()),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    if (orgId && product.orgId && product.orgId !== orgId) {
      throw new Error("Access Denied: Product belongs to another workspace.");
    }

    await ctx.db.patch(args.productId, { isActive: false });
    return { success: true };
  },
});

// ── recordStockIn mutation ──
export const recordStockIn = mutation({
  args: {
    token: v.optional(v.string()),
    productId: v.id("products"),
    locationId: v.id("locations"),
    quantity: v.number(),
    reason: v.optional(v.string()),
    lotNumber: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user: caller, orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager", "staff"]);
    if (args.quantity <= 0) throw new Error("Quantity must be positive.");

    const invList = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) => q.eq("productId", args.productId).eq("locationId", args.locationId))
      .collect();

    const inv = invList.length > 0 ? invList[0] : null;

    if (inv) {
      const newOnHand = inv.onHand + args.quantity;
      await ctx.db.patch(inv._id, {
        onHand: newOnHand,
        available: newOnHand - inv.reserved,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("inventory", {
        orgId,
        productId: args.productId,
        locationId: args.locationId,
        onHand: args.quantity,
        reserved: 0,
        available: args.quantity,
        lastUpdated: Date.now(),
      });
    }

    await ctx.db.insert("stockMovements", {
      orgId,
      productId: args.productId,
      locationId: args.locationId,
      userId: caller._id,
      type: "stock_in",
      reason: args.reason ?? args.reference ?? "Stock Receipt",
      quantity: args.quantity,
      lotNumber: args.lotNumber,
      expiryDate: args.expiryDate,
      notes: args.notes,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ── recordStockOut mutation ──
export const recordStockOut = mutation({
  args: {
    token: v.optional(v.string()),
    productId: v.id("products"),
    locationId: v.id("locations"),
    quantity: v.number(),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user: caller, orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager", "staff"]);
    if (args.quantity <= 0) throw new Error("Quantity must be positive.");

    const invList = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) => q.eq("productId", args.productId).eq("locationId", args.locationId))
      .collect();

    const inv = invList.length > 0 ? invList[0] : null;
    if (!inv || inv.available < args.quantity) {
      throw new Error(`Insufficient available stock (${inv?.available ?? 0} available).`);
    }

    const newOnHand = inv.onHand - args.quantity;
    await ctx.db.patch(inv._id, {
      onHand: newOnHand,
      available: newOnHand - inv.reserved,
      lastUpdated: Date.now(),
    });

    await ctx.db.insert("stockMovements", {
      orgId,
      productId: args.productId,
      locationId: args.locationId,
      userId: caller._id,
      type: "stock_out",
      reason: args.reason ?? args.reference ?? "Sales / Dispatch",
      quantity: args.quantity,
      notes: args.notes,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ── recordStockAdjustment mutation ──
export const recordStockAdjustment = mutation({
  args: {
    token: v.optional(v.string()),
    productId: v.id("products"),
    locationId: v.id("locations"),
    newOnHand: v.optional(v.number()),
    adjustedOnHand: v.optional(v.number()),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user: caller, orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    const targetOnHand = args.newOnHand ?? args.adjustedOnHand ?? 0;
    if (targetOnHand < 0) throw new Error("New stock cannot be negative.");

    const invList = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) => q.eq("productId", args.productId).eq("locationId", args.locationId))
      .collect();

    const inv = invList.length > 0 ? invList[0] : null;
    const currentOnHand = inv ? inv.onHand : 0;
    const diff = targetOnHand - currentOnHand;

    if (inv) {
      await ctx.db.patch(inv._id, {
        onHand: targetOnHand,
        available: targetOnHand - inv.reserved,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("inventory", {
        orgId,
        productId: args.productId,
        locationId: args.locationId,
        onHand: targetOnHand,
        reserved: 0,
        available: targetOnHand,
        lastUpdated: Date.now(),
      });
    }

    await ctx.db.insert("stockMovements", {
      orgId,
      productId: args.productId,
      locationId: args.locationId,
      userId: caller._id,
      type: "adjustment",
      reason: args.reason ?? args.reference ?? "Manual Count Adjustment",
      quantity: diff,
      notes: args.notes,
      createdAt: Date.now(),
    });

    return { success: true, delta: diff };
  },
});

// ── transferStockBetweenLocations mutation ──
export const transferStockBetweenLocations = mutation({
  args: {
    token: v.optional(v.string()),
    productId: v.id("products"),
    fromLocationId: v.id("locations"),
    toLocationId: v.id("locations"),
    quantity: v.number(),
    reason: v.optional(v.string()),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user: caller, orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    if (args.quantity <= 0) throw new Error("Quantity must be positive.");
    if (args.fromLocationId === args.toLocationId) throw new Error("Source and target locations must be different.");

    // Source inventory check
    const fromList = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) => q.eq("productId", args.productId).eq("locationId", args.fromLocationId))
      .collect();

    const fromInv = fromList.length > 0 ? fromList[0] : null;
    if (!fromInv || fromInv.available < args.quantity) {
      throw new Error(`Insufficient stock at source location (${fromInv?.available ?? 0} available).`);
    }

    // Deduct source
    const newFromOnHand = fromInv.onHand - args.quantity;
    await ctx.db.patch(fromInv._id, {
      onHand: newFromOnHand,
      available: newFromOnHand - fromInv.reserved,
      lastUpdated: Date.now(),
    });

    // Add target
    const toList = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) => q.eq("productId", args.productId).eq("locationId", args.toLocationId))
      .collect();

    const toInv = toList.length > 0 ? toList[0] : null;
    if (toInv) {
      const newToOnHand = toInv.onHand + args.quantity;
      await ctx.db.patch(toInv._id, {
        onHand: newToOnHand,
        available: newToOnHand - toInv.reserved,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("inventory", {
        orgId,
        productId: args.productId,
        locationId: args.toLocationId,
        onHand: args.quantity,
        reserved: 0,
        available: args.quantity,
        lastUpdated: Date.now(),
      });
    }

    // Record stock movements
    await ctx.db.insert("stockMovements", {
      orgId,
      productId: args.productId,
      locationId: args.fromLocationId,
      userId: caller._id,
      type: "transfer_out",
      reason: args.reason ?? args.reference ?? "Inter-Store Transfer Out",
      quantity: -args.quantity,
      createdAt: Date.now(),
    });

    await ctx.db.insert("stockMovements", {
      orgId,
      productId: args.productId,
      locationId: args.toLocationId,
      userId: caller._id,
      type: "transfer_in",
      reason: args.reason ?? args.reference ?? "Inter-Store Transfer In",
      quantity: args.quantity,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ── batchImportProducts mutation ──
export const batchImportProducts = mutation({
  args: {
    token: v.optional(v.string()),
    products: v.array(
      v.object({
        // Accept string inputs from CSV that will be sanitized
        sku: v.string(),
        name: v.string(),
        unit: v.union(v.literal("pcs"), v.literal("kg"), v.literal("litre"), v.literal("box"), v.literal("ml")),
        // Accept strings or numbers from CSV
        costPrice: v.union(v.string(), v.number()),
        sellingPrice: v.union(v.string(), v.number()),
        reorderPoint: v.union(v.string(), v.number()),
        safetyStock: v.union(v.string(), v.number()),
        trackBatches: v.optional(v.union(v.boolean(), v.string())),
        // Optional fields commonly in CSV
        category: v.optional(v.string()),
        minStockLevel: v.optional(v.union(v.string(), v.number())),
        expiryDate: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    try {
      const { user: caller, orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);

      // Get organization info once
      const org: any = await ctx.db.get(orgId);
      if (!org) {
        throw new Error("Organization not found");
      }

      const planTier = (org?.planTier ?? (org?.plan ? org.plan.toUpperCase() : "STARTER"));
      const rawStatus = (org?.subscriptionStatus ?? "FREE").toUpperCase();
      const isPaidActive = ["ACTIVE", "TRIALING", "TRIAL"].includes(rawStatus);

      // Get organization-scoped products using index for efficiency
      const orgProducts = await ctx.db
        .query("products")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect();

      // Create normalized SKU set for efficient duplicate lookup (trimmed, lowercase)
      const existingSkuSet = new Set(
        orgProducts
          .map((p) => p.sku?.trim().toLowerCase())
          .filter((sku): sku is string => sku !== null && sku !== undefined && sku !== "")
      );

      // Track SKUs within this import batch to catch duplicates
      const batchSkuSet = new Set<string>();

      let currentProductCount = orgProducts.length;

      // Track import results
      let imported = 0;
      let skipped = 0;
      const errors = [];

      // Build a category name → id cache to avoid repeated DB lookups
      const categoryCache = new Map<string, Id<"categories">>();
      const existingCategories = await ctx.db
        .query("categories")
        .withIndex("by_org", (q) => q.eq("orgId", orgId))
        .collect();
      for (const c of existingCategories) {
        categoryCache.set(c.name.toLowerCase(), c._id);
      }


      const validUnits = ["pcs", "kg", "litre", "box", "ml"] as const;
      type UnitType = (typeof validUnits)[number];

      // Process each product
      for (let i = 0; i < args.products.length; i++) {
        const item = args.products[i];
        const rowNumber = i + 1;

        try {
          // Check if SKU already exists in this organization (normalized comparison)
          const normalizedSku = item.sku?.trim().toLowerCase() || "";
          if (existingSkuSet.has(normalizedSku)) {
            console.log(`Processing row ${rowNumber}: SKU=${item.sku}, Reason: Duplicate SKU in organization`);
            skipped++;
            continue;
          }

          // Check plan limit before inserting
          if (planTier === "STARTER" || !isPaidActive) {
            if (currentProductCount >= 100) {
              console.log(`Processing row ${rowNumber}: SKU=${item.sku}, Reason: Plan limit reached`);
              throw new Error("Starter plan limit reached (100 SKUs max). Please upgrade to Growth plan for unlimited imports.");
            }
          }

          // 1. Normalize and sanitize unit type safely
          const validUnits = ["pcs", "kg", "litre", "box", "ml"] as const;
          type UnitType = (typeof validUnits)[number];
          const rawUnit = String(item.unit || "pcs").toLowerCase().trim();
          const resolvedUnit: UnitType = (validUnits as readonly string[]).includes(rawUnit)
            ? (rawUnit as UnitType)
            : "pcs";

          // 2. Build sanitized product fields
          const name = String(item.name || "").trim();
          const sku = String(item.sku || "").trim().toLowerCase();
          const costPrice = parseFloat(String(item.costPrice || "0")) || 0;
          const sellingPrice = parseFloat(String(item.sellingPrice || "0")) || 0;
          const reorderPoint = parseFloat(String(item.reorderPoint || "0")) || 0;
          const safetyStock = parseFloat(String(item.safetyStock || "0")) || 0;
          const trackBatches = Boolean(item.trackBatches);

          // 3. Validate required fields
          if (!name) {
            console.log(`Processing row ${rowNumber}: SKU=${item.sku}, Reason: Missing product name`);
            throw new Error("Product name is required");
          }
          if (!sku) {
            console.log(`Processing row ${rowNumber}: SKU=${item.sku}, Reason: Missing SKU`);
            throw new Error("SKU is required");
          }
          if (costPrice < 0) {
            console.log(`Processing row ${rowNumber}: SKU=${item.sku}, Reason: Negative cost price`);
            throw new Error("Cost price cannot be negative");
          }
          if (sellingPrice < 0) {
            console.log(`Processing row ${rowNumber}: SKU=${item.sku}, Reason: Negative selling price`);
            throw new Error("Selling price cannot be negative");
          }
          if (reorderPoint < 0) {
            console.log(`Processing row ${rowNumber}: SKU=${item.sku}, Reason: Negative reorder point`);
            throw new Error("Reorder point cannot be negative");
          }
          if (safetyStock < 0) {
            console.log(`Processing row ${rowNumber}: SKU=${item.sku}, Reason: Negative safety stock`);
            throw new Error("Safety stock cannot be negative");
          }

          // 4. Check for duplicate SKU within this import batch
          if (batchSkuSet.has(sku)) {
            console.log(`Processing row ${rowNumber}: SKU=${item.sku}, Reason: Duplicate SKU in import batch`);
            errors.push(`Row ${rowNumber}: Duplicate SKU '${sku}' in import batch`);
            skipped++;
            continue;
          }
          batchSkuSet.add(sku);

          // 5. Insert directly into the Convex products table
          await ctx.db.insert("products", {
            orgId: orgId,
            name: name,
            sku: String(item.sku || "").trim(),
            categoryId: await (async () => {
              const rawCat = (item.category ?? "").trim();
              if (!rawCat) return undefined;
              const key = rawCat.toLowerCase();
              if (categoryCache.has(key)) return categoryCache.get(key)!;
              // Create the category on-the-fly
              const newId = await ctx.db.insert("categories", {
                orgId,
                name: rawCat,
                createdAt: Date.now(),
              });
              categoryCache.set(key, newId);
              return newId;
            })(),
            unit: resolvedUnit,
            costPrice: costPrice,
            sellingPrice: sellingPrice,
            reorderPoint: reorderPoint,
            safetyStock: safetyStock,
            trackBatches: trackBatches,
            isActive: true,
            createdAt: Date.now(),
          });
          imported++;
        } catch (error: any) {
          const errMessage = error instanceof Error ? error.message : String(error);
          const errStack = error instanceof Error ? error.stack : undefined;

          console.error(`[CONVEX M(inventory:batchImportProducts)] Error processing row ${rowNumber}:`, {
            error: errMessage,
            item: item,
            stack: errStack,
          });
          errors.push(`Row ${rowNumber}: ${errMessage}`);
          skipped++;
        }
      } // end for loop

      // Return detailed result
      return {
        imported,
        importedCount: imported,
        skippedCount: skipped,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error: any) {
      const errMessage = error instanceof Error ? error.message : String(error);
      console.error("[CONVEX M(inventory:batchImportProducts)] Server Error:", {
        error: errMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error(`Import failed: ${errMessage}`);
    }
  },
});

// ── getStockOutFormData alias ──
export const getStockOutFormData = getStockInFormData;

// ── getProductPurchaseOrders query ──
export const getProductPurchaseOrders = query({
  args: {
    productId: v.id("products"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args?.token);
    const allPOs = await ctx.db.query("purchaseOrders").order("desc").collect();
    const pos = caller && caller.orgId ? allPOs.filter((po) => po.orgId === caller.orgId) : allPOs;

    const matching = pos.filter((po) => po.lineItems.some((line) => line.productId === args.productId));
    return await Promise.all(
      matching.map(async (po) => {
        const supplier = await ctx.db.get(po.supplierId);
        const line = po.lineItems.find((l) => l.productId === args.productId);
        return {
          ...po,
          supplierName: supplier?.name ?? "Unknown",
          lineQty: line?.quantityOrdered ?? 0,
          lineUnitCost: line?.unitCost ?? 0,
        };
      })
    );
  },
});

// ── getProductForecasts query ──
export const getProductForecasts = query({
  args: {
    productId: v.id("products"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args?.token);
    const forecasts = await ctx.db
      .query("forecasts")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    if (caller && caller.orgId) {
      return forecasts.filter((f) => !f.orgId || f.orgId === caller.orgId);
    }
    return forecasts;
  },
});
