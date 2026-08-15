import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCallerUser, requireCallerOrg } from "./lib/roleGuard";

const PRIORITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// ── 1. GET ALERTS QUERY (ROLE-BASED & FILTERED) ──
export const getAlerts = query({
  args: {
    token: v.optional(v.string()),
    status: v.optional(v.string()), // "all" | "read" | "unread"
    type: v.optional(v.string()),   // "all" | "low_stock" | "critical_stock" | "overstock" | "demand_spike" | "supplier_delay" | "system"
    priority: v.optional(v.string()), // "all" | "critical" | "high" | "medium" | "low"
    isDismissed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args?.token);
    if (!caller || !caller.orgId) return [];

    let alerts = await ctx.db.query("alerts").collect();
    alerts = alerts.filter((a) => a.orgId === caller.orgId);

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
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args?.token);
    if (!caller || !caller.orgId) {
      return { total: 0, critical: 0, unread: 0 };
    }

    const allAlerts = await ctx.db
      .query("alerts")
      .withIndex("by_active", (q) => q.eq("isDismissed", false))
      .collect();

    const alerts = allAlerts.filter((a) => a.orgId === caller.orgId);
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
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args?.token);
    if (!caller || !caller.orgId) {
      return {
        unread: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: 0,
        snoozed: 0,
        dismissed: 0,
      };
    }

    const rawAlerts = await ctx.db.query("alerts").collect();
    const allAlerts = rawAlerts.filter((a) => a.orgId === caller.orgId);
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
  args: {
    token: v.optional(v.string()),
    alertId: v.id("alerts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, { isRead: true });
  },
});

// Alias for markAlertRead
export const markAsRead = markAlertRead;

// ── 5. MARK ALL UNREAD ALERTS AS READ ──
export const markAllRead = mutation({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args?.token);
    if (!caller || !caller.orgId) return;

    const unreadAlerts = await ctx.db
      .query("alerts")
      .withIndex("by_active", (q) => q.eq("isDismissed", false))
      .collect();

    const orgUnread = unreadAlerts.filter((a) => a.orgId === caller.orgId && !a.isRead);
    for (const alert of orgUnread) {
      await ctx.db.patch(alert._id, { isRead: true });
    }
  },
});

export const snoozeAlert = mutation({
  args: {
    token: v.optional(v.string()),
    alertId: v.id("alerts"),
    snoozeHours: v.optional(v.number()),
    snoozeUntil: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const snoozedUntil = args.snoozeUntil ?? (Date.now() + (args.snoozeHours ?? 24) * 60 * 60 * 1000);
    await ctx.db.patch(args.alertId, { snoozedUntil });
  },
});

export const dismissAlert = mutation({
  args: {
    token: v.optional(v.string()),
    alertId: v.id("alerts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, { isDismissed: true });
  },
});

export const createAlert = mutation({
  args: {
    token: v.optional(v.string()),
    type: v.union(v.literal("low_stock"), v.literal("critical_stock"), v.literal("overstock"), v.literal("demand_spike"), v.literal("supplier_delay"), v.literal("system")),
    priority: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
    title: v.optional(v.string()),
    message: v.string(),
    productId: v.optional(v.id("products")),
    actionUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    return await ctx.db.insert("alerts", {
      orgId,
      type: args.type,
      priority: args.priority,
      message: args.message,
      productId: args.productId,
      isRead: false,
      isDismissed: false,
      createdAt: Date.now(),
    });
  },
});

export const getUserPreferences = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args?.token);
    if (caller && caller.orgId) {
      const existing = await ctx.db
        .query("userPreferences")
        .withIndex("by_org", (q) => q.eq("orgId", caller.orgId))
        .first();

      if (existing) {
        return {
          alertTypes: existing.alertTypes,
          channels: {
            inApp: existing.channels.inApp,
            email: existing.channels.email,
            push: (existing.channels as any).push ?? true,
          },
          thresholds: existing.thresholds,
        };
      }
    }

    return {
      alertTypes: {
        lowStock: true,
        criticalStock: true,
        overstock: true,
        demandSpike: true,
        system: true,
        reorders: true,
        pricing: true,
      },
      channels: {
        inApp: true,
        email: false,
        push: true,
      },
      thresholds: {
        lowStockMultiplier: 1.5,
        criticalStockMultiplier: 0.5,
      },
    };
  },
});

export const saveNotificationPreferences = mutation({
  args: {
    token: v.optional(v.string()),
    preferences: v.any(),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    if (!caller || !caller.orgId) return { success: false };

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_org", (q) => q.eq("orgId", caller.orgId))
      .first();

    const data = {
      orgId: caller.orgId,
      clerkId: caller._id,
      alertTypes: args.preferences.alertTypes || {
        lowStock: true,
        criticalStock: true,
        overstock: true,
        demandSpike: true,
        system: true,
      },
      channels: {
        inApp: Boolean(args.preferences.channels?.inApp ?? true),
        email: Boolean(args.preferences.channels?.email ?? false),
        push: Boolean(args.preferences.channels?.push ?? true),
      },
      thresholds: args.preferences.thresholds || {
        lowStockMultiplier: 1.5,
        criticalStockMultiplier: 0.5,
      },
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("userPreferences", data as any);
    }

    return { success: true };
  },
});