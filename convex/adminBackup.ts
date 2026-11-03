// convex/adminBackup.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCallerUser, requireCallerOrg } from "./lib/roleGuard";

// ── 1. EXPORT FULL DATABASE BACKUP (JSON DATASET) ──
export const exportFullDatabaseBackup = mutation({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Full tenant export: workspace administrators only.
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin"]);

    const products           = (await ctx.db.query("products").collect()).filter((p) => p.orgId === orgId);
    const inventory          = (await ctx.db.query("inventory").collect()).filter((i) => i.orgId === orgId);
    const suppliers          = (await ctx.db.query("suppliers").collect()).filter((s) => s.orgId === orgId);
    const categories         = (await ctx.db.query("categories").collect()).filter((c) => c.orgId === orgId);
    const locations          = (await ctx.db.query("locations").collect()).filter((l) => l.orgId === orgId);
    const stockMovements     = (await ctx.db.query("stockMovements").collect()).filter((sm) => sm.orgId === orgId);
    const purchaseOrders     = (await ctx.db.query("purchaseOrders").collect()).filter((po) => po.orgId === orgId);
    const reorderSuggestions = (await ctx.db.query("reorderSuggestions").collect()).filter((rs) => rs.orgId === orgId);
    const alerts             = (await ctx.db.query("alerts").collect()).filter((a) => a.orgId === orgId);
    const priceSuggestions   = (await ctx.db.query("priceSuggestions").collect()).filter((ps) => ps.orgId === orgId);
    const users              = (await ctx.db.query("users").collect()).filter((u) => u.orgId === orgId);

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

    const backupObject = {
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

    return {
      jsonString: JSON.stringify(backupObject, null, 2),
      recordCount: backupObject.metadata.totalRecords,
    };
  },
});

// ── 2. GET SYSTEM DATA STATS (STRICT ORG SCOPED) ──
export const getSystemDataStats = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    if (!caller || !caller.orgId || caller.role !== "admin") {
      return {
        productCount: 0,
        inventoryCount: 0,
        supplierCount: 0,
        categoryCount: 0,
        locationCount: 0,
        movementCount: 0,
        poCount: 0,
        alertCount: 0,
        userCount: 0,
        totalRecords: 0,
      };
    }

    const orgId = caller.orgId;
    const products       = (await ctx.db.query("products").collect()).filter((p) => p.orgId === orgId);
    const inventory      = (await ctx.db.query("inventory").collect()).filter((i) => i.orgId === orgId);
    const suppliers      = (await ctx.db.query("suppliers").collect()).filter((s) => s.orgId === orgId);
    const categories     = (await ctx.db.query("categories").collect()).filter((c) => c.orgId === orgId);
    const locations      = (await ctx.db.query("locations").collect()).filter((l) => l.orgId === orgId);
    const stockMovements = (await ctx.db.query("stockMovements").collect()).filter((sm) => sm.orgId === orgId);
    const purchaseOrders = (await ctx.db.query("purchaseOrders").collect()).filter((po) => po.orgId === orgId);
    const alerts         = (await ctx.db.query("alerts").collect()).filter((a) => a.orgId === orgId);
    const users          = (await ctx.db.query("users").collect()).filter((u) => u.orgId === orgId);

    return {
      productCount: products.length,
      inventoryCount: inventory.reduce((sum, item) => sum + (item.onHand || 0), 0),
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

// ── 3. CHUNKED WIPE OPERATIONAL DATA (SCOPED TO WORKSPACE ORG) ──
export const wipeBatchChunk = mutation({
  args: {
    token: v.optional(v.string()),
    confirmationCode: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin"]);
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
    ] as const;

    let deletedCount = 0;
    const CHUNK_LIMIT = 350;

    for (const tableName of tablesToWipe) {
      const records = await ctx.db.query(tableName).collect();
      const orgRecords = records.filter((r) => r.orgId === orgId).slice(0, CHUNK_LIMIT - deletedCount);
      for (const record of orgRecords) {
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
    token: v.optional(v.string()),
    confirmationCode: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin"]);
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
    ] as const;

    let deletedCount = 0;
    for (const tableName of tablesToWipe) {
      const records = await ctx.db.query(tableName).collect();
      const orgRecords = records.filter((r) => r.orgId === orgId).slice(0, 200);
      for (const record of orgRecords) {
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
    token: v.optional(v.string()),
    backupJsonString: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin"]);

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

    // Foreign keys inside a backup are untrusted. Only ids that were re-created
    // by THIS restore (present in idMap) are accepted; anything else is dropped so a
    // crafted backup can never reference another tenant's documents.
    const getValidId = (table: any, id: any): any => {
      if (!id || typeof id !== "string") return undefined;
      const mapped = idMap.get(id);
      if (!mapped) return undefined;
      return ctx.db.normalizeId(table, mapped) || undefined;
    };

    // Users are not restored; a user reference is kept only if it is an existing
    // member of the caller's organization.
    const getOrgUserId = async (id: any): Promise<any> => {
      if (!id || typeof id !== "string") return undefined;
      const userId = ctx.db.normalizeId("users", id);
      if (!userId) return undefined;
      const user = await ctx.db.get(userId);
      return user && user.orgId === orgId ? userId : undefined;
    };

    // 1. Locations
    if (Array.isArray(data.locations)) {
      for (const loc of data.locations) {
        const oldId = loc._id;
        const newId = await ctx.db.insert("locations", {
          orgId,
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
          orgId,
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
          orgId,
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
        const categoryId = getValidId("categories", prod.categoryId);
        const primarySupplierId = getValidId("suppliers", prod.primarySupplierId);
        
        const newId = await ctx.db.insert("products", {
          orgId,
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
          barcode: prod.barcode,
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
        const productId = getValidId("products", inv.productId);
        const locationId = getValidId("locations", inv.locationId);
        if (productId && locationId) {
          const oldId = inv._id;
          const newId = await ctx.db.insert("inventory", {
            orgId,
            productId,
            locationId,
            onHand: inv.onHand || 0,
            reserved: inv.reserved || 0,
            available: inv.available || 0,
            lastUpdated: inv.lastUpdated || Date.now(),
          });
          if (oldId) idMap.set(oldId, newId);
          insertedTotal++;
        }
      }
    }

    // 6. Stock Movements
    if (Array.isArray(data.stockMovements)) {
      for (const sm of data.stockMovements) {
        const productId = getValidId("products", sm.productId);
        const locationId = getValidId("locations", sm.locationId);
        const userId = await getOrgUserId(sm.userId);
        if (productId && locationId) {
          await ctx.db.insert("stockMovements", {
            orgId,
            productId,
            locationId,
            type: sm.type,
            quantity: sm.quantity,
            userId,
            reason: sm.reason || "Imported",
            reference: sm.reference,
            createdAt: sm.createdAt || Date.now(),
          });
          insertedTotal++;
        }
      }
    }

    if (Array.isArray(data.purchaseOrders)) {
      for (const po of data.purchaseOrders) {
        const supplierId = getValidId("suppliers", po.supplierId);
        if (supplierId) {
          const lineItems = (po.lineItems || [])
            .map((li: any) => ({
              ...li,
              productId: getValidId("products", li.productId),
            }))
            .filter((li: any) => !!li.productId);

          await ctx.db.insert("purchaseOrders", {
            orgId,
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

    if (Array.isArray(data.reorderSuggestions)) {
      for (const rs of data.reorderSuggestions) {
        const productId = getValidId("products", rs.productId);
        const preferredSupplierId = getValidId("suppliers", rs.preferredSupplierId);
        if (productId && preferredSupplierId) {
          await ctx.db.insert("reorderSuggestions", {
            orgId,
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
        const productId = getValidId("products", alt.productId);
        await ctx.db.insert("alerts", {
          orgId,
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
        const productId = getValidId("products", ps.productId);
        if (productId) {
          await ctx.db.insert("priceSuggestions", {
            orgId,
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
