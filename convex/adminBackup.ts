// convex/adminBackup.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── 1. EXPORT FULL DATABASE BACKUP (JSON DATASET) ──
export const exportFullDatabaseBackup = query({
  args: {},
  handler: async (ctx) => {
    const products           = await ctx.db.query("products").collect();
    const inventory          = await ctx.db.query("inventory").collect();
    const suppliers          = await ctx.db.query("suppliers").collect();
    const categories         = await ctx.db.query("categories").collect();
    const locations          = await ctx.db.query("locations").collect();
    const stockMovements     = await ctx.db.query("stockMovements").collect();
    const purchaseOrders     = await ctx.db.query("purchaseOrders").collect();
    const reorderSuggestions = await ctx.db.query("reorderSuggestions").collect();
    const alerts             = await ctx.db.query("alerts").collect();
    const priceSuggestions   = await ctx.db.query("priceSuggestions").collect();
    const users              = await ctx.db.query("users").collect();

    // Sanitize user records to omit sensitive password hashes from raw exports
    const sanitizedUsers = users.map((u) => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      role: u.role,
      plan: u.plan,
      isActive: u.isActive,
      imageUrl: u.imageUrl,
      createdAt: u.createdAt,
    }));

    return {
      metadata: {
        system: "RetailMind AI Supermarket Management",
        version: "2.5.0",
        exportedAt: Date.now(),
        exportedAtIso: new Date().toISOString(),
        totalRecords:
          products.length +
          inventory.length +
          suppliers.length +
          categories.length +
          locations.length +
          stockMovements.length +
          purchaseOrders.length +
          reorderSuggestions.length +
          alerts.length +
          priceSuggestions.length +
          sanitizedUsers.length,
        tableCounts: {
          products: products.length,
          inventory: inventory.length,
          suppliers: suppliers.length,
          categories: categories.length,
          locations: locations.length,
          stockMovements: stockMovements.length,
          purchaseOrders: purchaseOrders.length,
          reorderSuggestions: reorderSuggestions.length,
          alerts: alerts.length,
          priceSuggestions: priceSuggestions.length,
          users: sanitizedUsers.length,
        },
      },
      data: {
        products,
        inventory,
        suppliers,
        categories,
        locations,
        stockMovements,
        purchaseOrders,
        reorderSuggestions,
        alerts,
        priceSuggestions,
        users: sanitizedUsers,
      },
    };
  },
});

// ── 2. GET SYSTEM DATA STATS ──
export const getSystemDataStats = query({
  args: {},
  handler: async (ctx) => {
    const products       = await ctx.db.query("products").collect();
    const inventory      = await ctx.db.query("inventory").collect();
    const suppliers      = await ctx.db.query("suppliers").collect();
    const categories     = await ctx.db.query("categories").collect();
    const locations      = await ctx.db.query("locations").collect();
    const stockMovements = await ctx.db.query("stockMovements").collect();
    const purchaseOrders = await ctx.db.query("purchaseOrders").collect();
    const alerts         = await ctx.db.query("alerts").collect();
    const users          = await ctx.db.query("users").collect();

    return {
      productCount: products.length,
      inventoryCount: inventory.length,
      supplierCount: suppliers.length,
      categoryCount: categories.length,
      locationCount: locations.length,
      movementCount: stockMovements.length,
      poCount: purchaseOrders.length,
      alertCount: alerts.length,
      userCount: users.length,
      totalRecords:
        products.length +
        inventory.length +
        suppliers.length +
        categories.length +
        locations.length +
        stockMovements.length +
        purchaseOrders.length +
        alerts.length +
        users.length,
    };
  },
});

// ── 3. CHUNKED WIPE OPERATIONAL DATA (PREVENTS CONVEX 4096 EXECUTION LIMIT) ──
export const wipeBatchChunk = mutation({
  args: {
    confirmationCode: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.confirmationCode !== "DELETE PERMANENTLY ALL DATA") {
      throw new Error("Invalid confirmation code. Wipe aborted.");
    }

    const tablesToWipe = [
      "alerts",
      "priceSuggestions",
      "reorderSuggestions",
      "purchaseOrders",
      "stockMovements",
      "inventory",
      "products",
      "suppliers",
      "categories",
      "locations",
    ] as const;

    let deletedCount = 0;
    const CHUNK_LIMIT = 350; // Safely below Convex 4096 read/write execution cap

    for (const tableName of tablesToWipe) {
      const records = await ctx.db.query(tableName).take(CHUNK_LIMIT - deletedCount);
      for (const record of records) {
        await ctx.db.delete(record._id);
        deletedCount++;
        if (deletedCount >= CHUNK_LIMIT) break;
      }
      if (deletedCount >= CHUNK_LIMIT) break;
    }

    return {
      deletedCount,
      hasMore: deletedCount >= CHUNK_LIMIT,
    };
  },
});

// Legacy single-call compatibility export
export const wipeOperationalData = mutation({
  args: {
    confirmationCode: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.confirmationCode !== "DELETE PERMANENTLY ALL DATA") {
      throw new Error("Invalid confirmation code. Wipe aborted.");
    }

    const tablesToWipe = [
      "alerts",
      "priceSuggestions",
      "reorderSuggestions",
      "purchaseOrders",
      "stockMovements",
      "inventory",
      "products",
      "suppliers",
      "categories",
      "locations",
    ] as const;

    let deletedCount = 0;
    for (const tableName of tablesToWipe) {
      const records = await ctx.db.query(tableName).take(200);
      for (const record of records) {
        await ctx.db.delete(record._id);
        deletedCount++;
      }
    }

    return {
      success: true,
      deletedCount,
      message: `Deleted batch of ${deletedCount} records.`,
    };
  },
});

// ── 4. RESTORE FULL DATABASE FROM BACKUP (JSON DATASET) ──
export const restoreFullDatabaseBackup = mutation({
  args: {
    backupJsonString: v.string(),
  },
  handler: async (ctx, args) => {
    let backupPayload: any;
    try {
      backupPayload = JSON.parse(args.backupJsonString);
    } catch (err) {
      throw new Error("Invalid JSON backup file format.");
    }

    const data = backupPayload.data || backupPayload;
    if (!data) {
      throw new Error("Backup file contains no valid data object.");
    }

    const idMap = new Map<string, any>();
    let insertedTotal = 0;

    // 1. Locations
    if (Array.isArray(data.locations)) {
      for (const loc of data.locations) {
        const oldId = loc._id;
        const newId = await ctx.db.insert("locations", {
          name: loc.name,
          address: loc.address,
          type: loc.type || "store",
          isActive: loc.isActive ?? true,
          createdAt: loc.createdAt || Date.now(),
        });
        if (oldId) idMap.set(oldId, newId);
        insertedTotal++;
      }
    }

    // 2. Categories
    if (Array.isArray(data.categories)) {
      for (const cat of data.categories) {
        const oldId = cat._id;
        const newId = await ctx.db.insert("categories", {
          name: cat.name,
          description: cat.description,
          createdAt: cat.createdAt || Date.now(),
        });
        if (oldId) idMap.set(oldId, newId);
        insertedTotal++;
      }
    }

    // 3. Suppliers
    if (Array.isArray(data.suppliers)) {
      for (const sup of data.suppliers) {
        const oldId = sup._id;
        const newId = await ctx.db.insert("suppliers", {
          name: sup.name,
          email: sup.email,
          phone: sup.phone,
          address: sup.address,
          paymentTerms: sup.paymentTerms,
          leadTimeDays: sup.leadTimeDays,
          status: sup.status || "active",
          reliabilityScore: sup.reliabilityScore,
          isActive: sup.isActive ?? true,
          createdAt: sup.createdAt || Date.now(),
        });
        if (oldId) idMap.set(oldId, newId);
        insertedTotal++;
      }
    }

    // 4. Products
    if (Array.isArray(data.products)) {
      for (const prod of data.products) {
        const oldId = prod._id;
        const categoryId = idMap.get(prod.categoryId) || prod.categoryId;
        const primarySupplierId = idMap.get(prod.primarySupplierId) || prod.primarySupplierId;

        const newId = await ctx.db.insert("products", {
          categoryId,
          primarySupplierId,
          sku: prod.sku,
          name: prod.name,
          description: prod.description,
          unit: prod.unit || "pcs",
          costPrice: prod.costPrice,
          sellingPrice: prod.sellingPrice,
          reorderPoint: prod.reorderPoint,
          safetyStock: prod.safetyStock,
          trackBatches: prod.trackBatches ?? false,
          isActive: prod.isActive ?? true,
          createdAt: prod.createdAt || Date.now(),
        });
        if (oldId) idMap.set(oldId, newId);
        insertedTotal++;
      }
    }

    // 5. Inventory
    if (Array.isArray(data.inventory)) {
      for (const inv of data.inventory) {
        const productId = idMap.get(inv.productId) || inv.productId;
        const locationId = idMap.get(inv.locationId) || inv.locationId;
        if (productId && locationId) {
          await ctx.db.insert("inventory", {
            productId,
            locationId,
            onHand: inv.onHand || 0,
            reserved: inv.reserved || 0,
            available: inv.available || 0,
            lastUpdated: inv.lastUpdated || Date.now(),
          });
          insertedTotal++;
        }
      }
    }

    // 6. Stock Movements
    if (Array.isArray(data.stockMovements)) {
      for (const sm of data.stockMovements) {
        const productId = idMap.get(sm.productId) || sm.productId;
        const locationId = idMap.get(sm.locationId) || sm.locationId;
        if (productId && locationId) {
          await ctx.db.insert("stockMovements", {
            productId,
            locationId,
            type: sm.type || "stock_in",
            reason: sm.reason || "Imported",
            quantity: sm.quantity || 0,
            reference: sm.reference,
            createdAt: sm.createdAt || Date.now(),
          });
          insertedTotal++;
        }
      }
    }

    // 7. Purchase Orders
    if (Array.isArray(data.purchaseOrders)) {
      for (const po of data.purchaseOrders) {
        const supplierId = idMap.get(po.supplierId) || po.supplierId;
        if (supplierId) {
          const lineItems = (po.lineItems || []).map((li: any) => ({
            productId: idMap.get(li.productId) || li.productId,
            quantityOrdered: li.quantityOrdered,
            quantityReceived: li.quantityReceived ?? 0,
            unitCost: li.unitCost,
            lineTotal: li.lineTotal,
          }));

          await ctx.db.insert("purchaseOrders", {
            supplierId,
            poNumber: po.poNumber,
            status: po.status || "draft",
            lineItems,
            totalValue: po.totalValue || 0,
            requestedDelivery: po.requestedDelivery,
            createdAt: po.createdAt || Date.now(),
            updatedAt: po.updatedAt || Date.now(),
          });
          insertedTotal++;
        }
      }
    }

    // 8. Reorder Suggestions
    if (Array.isArray(data.reorderSuggestions)) {
      for (const rs of data.reorderSuggestions) {
        const productId = idMap.get(rs.productId) || rs.productId;
        const preferredSupplierId = idMap.get(rs.preferredSupplierId) || rs.preferredSupplierId;
        if (productId && preferredSupplierId) {
          await ctx.db.insert("reorderSuggestions", {
            productId,
            preferredSupplierId,
            urgency: rs.urgency || "medium",
            suggestedQuantity: rs.suggestedQuantity,
            estimatedCost: rs.estimatedCost,
            orderByDate: rs.orderByDate,
            rationale: rs.rationale,
            status: rs.status || "pending",
            aiGenerated: rs.aiGenerated ?? true,
            createdAt: rs.createdAt || Date.now(),
          });
          insertedTotal++;
        }
      }
    }

    // 9. Alerts
    if (Array.isArray(data.alerts)) {
      for (const alt of data.alerts) {
        const productId = alt.productId ? (idMap.get(alt.productId) || alt.productId) : undefined;
        await ctx.db.insert("alerts", {
          productId,
          type: alt.type || "system",
          priority: alt.priority || "medium",
          message: alt.message,
          isRead: alt.isRead ?? false,
          isDismissed: alt.isDismissed ?? false,
          snoozedUntil: alt.snoozedUntil,
          createdAt: alt.createdAt || Date.now(),
        });
        insertedTotal++;
      }
    }

    // 10. Price Suggestions
    if (Array.isArray(data.priceSuggestions)) {
      for (const ps of data.priceSuggestions) {
        const productId = idMap.get(ps.productId) || ps.productId;
        if (productId) {
          await ctx.db.insert("priceSuggestions", {
            productId,
            currentPrice: ps.currentPrice,
            suggestedPrice: ps.suggestedPrice,
            priceChange: ps.priceChange,
            changeDirection: ps.changeDirection || "maintain",
            reason: ps.reason,
            confidence: ps.confidence,
            factors: ps.factors || { stockLevel: "healthy", demandTrend: "stable", seasonality: "normal", daysOfStock: 30 },
            status: ps.status || "pending",
            appliedAt: ps.appliedAt,
            createdAt: ps.createdAt || Date.now(),
          });
          insertedTotal++;
        }
      }
    }

    return {
      success: true,
      insertedTotal,
      message: `Successfully imported and restored ${insertedTotal} data records into the database with re-mapped relational keys!`,
    };
  },
});
