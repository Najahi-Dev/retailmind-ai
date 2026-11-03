import { internalMutation, mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getCallerUser, requireCallerOrg } from "./lib/roleGuard";
import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/** Loads an alert and enforces that it belongs to the caller's organization. */
async function requireOwnedAlert(ctx: MutationCtx, token: string | undefined, alertId: Id<"alerts">) {
  const { orgId } = await requireCallerOrg(ctx, token);
  const alert = await ctx.db.get(alertId);
  if (!alert) throw new ConvexError("Alert not found");
  if (!alert.orgId || alert.orgId !== orgId) {
    throw new ConvexError("Access Denied: Resource belongs to another organization.");
  }
  return alert;
}

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

    const orgId = caller.orgId;
    let alerts = await ctx.db
      .query("alerts")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

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

    const orgId = caller.orgId;
    const allAlerts = await ctx.db
      .query("alerts")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();
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

// ── 4. MARK SINGLE ALERT AS READ (DELETES FROM DB) ──
export const markAlertRead = mutation({
  args: {
    token: v.optional(v.string()),
    alertId: v.id("alerts"),
  },
  handler: async (ctx, args) => {
    const alert = await requireOwnedAlert(ctx, args.token, args.alertId);
    await ctx.db.delete(alert._id);
  },
});

// Alias for markAlertRead
export const markAsRead = markAlertRead;

// ── 5. MARK ALL UNREAD ALERTS AS READ (DELETES FROM DB) ──
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
      await ctx.db.delete(alert._id);
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
    const alert = await requireOwnedAlert(ctx, args.token, args.alertId);
    const snoozedUntil = args.snoozeUntil ?? (Date.now() + (args.snoozeHours ?? 24) * 60 * 60 * 1000);
    await ctx.db.patch(alert._id, { snoozedUntil });
  },
});

export const dismissAlert = mutation({
  args: {
    token: v.optional(v.string()),
    alertId: v.id("alerts"),
  },
  handler: async (ctx, args) => {
    const alert = await requireOwnedAlert(ctx, args.token, args.alertId);
    await ctx.db.patch(alert._id, { isDismissed: true });
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
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager", "supplier"]);
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

const preferencesValidator = v.object({
  alertTypes: v.optional(
    v.object({
      lowStock: v.optional(v.boolean()),
      criticalStock: v.optional(v.boolean()),
      overstock: v.optional(v.boolean()),
      demandSpike: v.optional(v.boolean()),
      system: v.optional(v.boolean()),
      reorders: v.optional(v.boolean()),
      pricing: v.optional(v.boolean()),
      supplierDelay: v.optional(v.boolean()),
    }),
  ),
  channels: v.optional(
    v.object({
      inApp: v.optional(v.boolean()),
      email: v.optional(v.boolean()),
      push: v.optional(v.boolean()),
    }),
  ),
  thresholds: v.optional(
    v.object({
      lowStockMultiplier: v.number(),
      criticalStockMultiplier: v.number(),
    }),
  ),
});

// Preferences are stored per organization, so only admins/managers may change them.
export const saveNotificationPreferences = mutation({
  args: {
    token: v.optional(v.string()),
    preferences: preferencesValidator,
  },
  handler: async (ctx, args) => {
    const { user: caller, orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);

    const thresholds = args.preferences.thresholds;
    if (
      thresholds &&
      (!Number.isFinite(thresholds.lowStockMultiplier) ||
        !Number.isFinite(thresholds.criticalStockMultiplier) ||
        thresholds.lowStockMultiplier < 0 ||
        thresholds.lowStockMultiplier > 100 ||
        thresholds.criticalStockMultiplier < 0 ||
        thresholds.criticalStockMultiplier > 100)
    ) {
      throw new ConvexError("Invalid threshold values");
    }

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();

    const data = {
      orgId,
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
      thresholds: thresholds || {
        lowStockMultiplier: 1.5,
        criticalStockMultiplier: 0.5,
      },
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("userPreferences", data);
    }

    return { success: true };
  },
});
