import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

const PRIORITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// ── 1. GET ALERTS QUERY (ROLE-BASED & FILTERED) ──
export const getAlerts = query({
  args: {
    status: v.optional(v.string()), // "all" | "read" | "unread"
    type: v.optional(v.string()),   // "all" | "low_stock" | "critical_stock" | "overstock" | "demand_spike" | "supplier_delay" | "system"
    priority: v.optional(v.string()), // "all" | "critical" | "high" | "medium" | "low"
    isDismissed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let alerts = await ctx.db.query("alerts").collect();

    // Default: filter out dismissed alerts unless specified
    if (args.isDismissed !== undefined) {
      alerts = alerts.filter((a) => a.isDismissed === args.isDismissed);
    } else {
      alerts = alerts.filter((a) => !a.isDismissed);
    }

    // Filter by status (read / unread)
    if (args.status && args.status !== "all") {
      if (args.status === "unread") {
        alerts = alerts.filter((a) => !a.isRead);
      } else if (args.status === "read") {
        alerts = alerts.filter((a) => a.isRead);
      }
    }

    // Filter by priority
    if (args.priority && args.priority !== "all") {
      alerts = alerts.filter((a) => a.priority === args.priority);
    }

    // Filter by alert type
    if (args.type && args.type !== "all") {
      alerts = alerts.filter((a) => a.type === args.type);
    }

    // Filter out snoozed alerts automatically (snoozedUntil in the future)
    const now = Date.now();
    alerts = alerts.filter((a) => !a.snoozedUntil || a.snoozedUntil <= now);

    // Join Product details
    const joined = await Promise.all(
      alerts.map(async (alert) => {
        let product = null;
        if (alert.productId) {
          const p = await ctx.db.get(alert.productId);
          if (p) {
            product = {
              _id: p._id,
              name: p.name,
              sku: p.sku,
              unit: p.unit,
            };
          }
        }
        return {
          ...alert,
          product,
        };
      })
    );

    // Sort by Priority first (Critical > High > Medium > Low) then by createdAt DESC
    return joined.sort((a, b) => {
      const pA = PRIORITY_ORDER[a.priority] ?? 0;
      const pB = PRIORITY_ORDER[b.priority] ?? 0;
      if (pA !== pB) return pB - pA;
      return b.createdAt - a.createdAt;
    });
  },
});

// ── 2. GET UNREAD COUNT (FOR NAVBAR & BADGES) ──
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_active", (q) => q.eq("isDismissed", false))
      .collect();

    const now = Date.now();
    const active = alerts.filter((a) => !a.snoozedUntil || a.snoozedUntil <= now);

    return {
      total: active.length,
      critical: active.filter((a) => a.priority === "critical").length,
      unread: active.filter((a) => !a.isRead).length,
    };
  },
});

// ── 3. GET ALERT STATS (FOR KPI CARDS & SIDEBAR BADGE) ──
export const getAlertStats = query({
  args: {},
  handler: async (ctx) => {
    const allAlerts = await ctx.db.query("alerts").collect();
    const now = Date.now();

    const active = allAlerts.filter((a) => !a.isDismissed);
    const nonSnoozed = active.filter(
      (a) => !a.snoozedUntil || a.snoozedUntil <= now
    );
    const snoozed = active.filter(
      (a) => a.snoozedUntil && a.snoozedUntil > now
    );

    return {
      unread: nonSnoozed.filter((a) => !a.isRead).length,
      critical: nonSnoozed.filter((a) => a.priority === "critical").length,
      high: nonSnoozed.filter((a) => a.priority === "high").length,
      medium: nonSnoozed.filter((a) => a.priority === "medium").length,
      low: nonSnoozed.filter((a) => a.priority === "low").length,
      total: nonSnoozed.length,
      snoozed: snoozed.length,
      dismissed: allAlerts.filter((a) => a.isDismissed).length,
    };
  },
});

// ── 4. MARK SINGLE ALERT AS READ ──
export const markAlertRead = mutation({
  args: { alertId: v.id("alerts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, { isRead: true });
  },
});

// Alias for markAlertRead
export const markAsRead = markAlertRead;

// ── 5. MARK ALL UNREAD ALERTS AS READ ──
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const unreadAlerts = await ctx.db
      .query("alerts")
      .withIndex("by_active", (q) => q.eq("isDismissed", false))
      .collect();

    for (const alert of unreadAlerts) {
      if (!alert.isRead) {
        await ctx.db.patch(alert._id, { isRead: true });
      }
    }
  },
});

// Alias for markAllRead
export const markAllAsRead = markAllRead;

// ── 6. DISMISS SINGLE ALERT ──
export const dismissAlert = mutation({
  args: { alertId: v.id("alerts") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, { isDismissed: true });
  },
});

// ── 7. DISMISS ALL ACTIVE ALERTS ──
export const dismissAllAlerts = mutation({
  args: {},
  handler: async (ctx) => {
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_active", (q) => q.eq("isDismissed", false))
      .collect();

    for (const a of alerts) {
      await ctx.db.patch(a._id, { isDismissed: true });
    }
  },
});

// ── 8. SNOOZE ALERT ──
export const snoozeAlert = mutation({
  args: {
    alertId: v.id("alerts"),
    snoozeUntil: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, {
      snoozedUntil: args.snoozeUntil,
      isRead: true,
    });
  },
});

// ── 9. INTERNAL MUTATION: GENERATE STOCK ALERTS IN REAL-TIME ──
export const generateStockAlerts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const inventoryRecords = await ctx.db.query("inventory").collect();
    const activeAlerts = await ctx.db
      .query("alerts")
      .withIndex("by_active", (q) => q.eq("isDismissed", false))
      .collect();

    const now = Date.now();

    for (const inv of inventoryRecords) {
      const product = await ctx.db.get(inv.productId);
      if (!product || !product.isActive) continue;

      const onHand = inv.onHand;
      const safetyStock = product.safetyStock;
      const reorderPoint = product.reorderPoint;

      // 1. Critical Stock Alert (onHand <= safetyStock)
      if (onHand <= safetyStock) {
        const hasActiveCritical = activeAlerts.some(
          (a) =>
            a.productId === product._id &&
            a.type === "critical_stock" &&
            !a.isDismissed
        );

        if (!hasActiveCritical) {
          await ctx.db.insert("alerts", {
            productId: product._id,
            type: "critical_stock",
            priority: "critical",
            message: `Critical Outage Alert: ${product.name} (${product.sku}) stock level (${onHand} ${product.unit}) is at or below safety threshold (${safetyStock}).`,
            isRead: false,
            isDismissed: false,
            createdAt: now,
          });
        }
      }
      // 2. Low Stock Alert (onHand < reorderPoint && onHand > safetyStock)
      else if (onHand < reorderPoint) {
        const hasActiveLow = activeAlerts.some(
          (a) =>
            a.productId === product._id &&
            a.type === "low_stock" &&
            !a.isDismissed
        );

        if (!hasActiveLow) {
          await ctx.db.insert("alerts", {
            productId: product._id,
            type: "low_stock",
            priority: "high",
            message: `Low Stock Warning: ${product.name} (${product.sku}) stock level (${onHand} ${product.unit}) has dropped below reorder point (${reorderPoint}).`,
            isRead: false,
            isDismissed: false,
            createdAt: now,
          });
        }
      }
      // 3. Overstock Alert (onHand > reorderPoint * 5)
      else if (reorderPoint > 0 && onHand > reorderPoint * 5) {
        const hasActiveOverstock = activeAlerts.some(
          (a) =>
            a.productId === product._id &&
            a.type === "overstock" &&
            !a.isDismissed
        );

        if (!hasActiveOverstock) {
          await ctx.db.insert("alerts", {
            productId: product._id,
            type: "overstock",
            priority: "medium",
            message: `Overstock Warning: ${product.name} (${product.sku}) stock level (${onHand} ${product.unit}) exceeds 5x reorder threshold (${reorderPoint * 5}).`,
            isRead: false,
            isDismissed: false,
            createdAt: now,
          });
        }
      }
    }
  },
});

// ── 10. CREATE SYSTEM ALERT (ADMIN ONLY) ──
export const createSystemAlert = mutation({
  args: {
    productId: v.optional(v.id("products")),
    type: v.union(
      v.literal("low_stock"),
      v.literal("critical_stock"),
      v.literal("overstock"),
      v.literal("demand_spike"),
      v.literal("supplier_delay"),
      v.literal("system")
    ),
    priority: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const alertId = await ctx.db.insert("alerts", {
      productId: args.productId,
      type: args.type,
      priority: args.priority,
      message: args.message,
      isRead: false,
      isDismissed: false,
      createdAt: Date.now(),
    });
    return alertId;
  },
});

// Alias for createSystemAlert
export const createAlert = createSystemAlert;

// ── 11. GET USER NOTIFICATION PREFERENCES ──
export const getUserPreferences = query({
  args: {},
  handler: async (ctx) => {
    return {
      alertTypes: {
        lowStock: true,
        criticalStock: true,
        overstock: true,
        demandSpike: true,
        system: true,
      },
      channels: {
        inApp: true,
        email: false,
      },
      thresholds: {
        lowStockMultiplier: 1.0,
        criticalStockMultiplier: 1.0,
      },
    };
  },
});

// ── 12. SAVE USER NOTIFICATION PREFERENCES ──
export const saveNotificationPreferences = mutation({
  args: {
    alertTypes: v.object({
      lowStock: v.boolean(),
      criticalStock: v.boolean(),
      overstock: v.boolean(),
      demandSpike: v.boolean(),
      system: v.boolean(),
    }),
    channels: v.object({
      inApp: v.boolean(),
      email: v.boolean(),
    }),
    thresholds: v.object({
      lowStockMultiplier: v.number(),
      criticalStockMultiplier: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    return { success: true };
  },
});