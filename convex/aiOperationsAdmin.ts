import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSuperAdmin } from "./lib/roleGuard";


export const getAIOperationalSettings = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    const settings = await ctx.db.query("aiOperationalSettings").first();
    
    if (!settings) {
      return {
        forecastHorizonDays: 90,
        retrainingSchedule: "weekly",
        globalMinProfitMarginPercent: 15,
        globalMaxDiscountPercent: 50,
        globalMaxDailyPriceChangePercent: 10,
        requireApprovalForHighRisk: true,
        globalSafetyStockDays: 14,
        globalExpiryWarningDays: 30,
        updatedAt: Date.now(),
      };
    }
    return settings;
  }
});

export const updateAIOperationalSettings = mutation({
  args: {
    token: v.optional(v.string()),
    updates: v.object({
      forecastHorizonDays: v.optional(v.number()),
      retrainingSchedule: v.optional(v.string()),
      globalMinProfitMarginPercent: v.optional(v.number()),
      globalMaxDiscountPercent: v.optional(v.number()),
      globalMaxDailyPriceChangePercent: v.optional(v.number()),
      requireApprovalForHighRisk: v.optional(v.boolean()),
      globalSafetyStockDays: v.optional(v.number()),
      globalExpiryWarningDays: v.optional(v.number()),
    })
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    
    const settings = await ctx.db.query("aiOperationalSettings").first();
    if (!settings) {
      await ctx.db.insert("aiOperationalSettings", {
        forecastHorizonDays: args.updates.forecastHorizonDays ?? 90,
        retrainingSchedule: args.updates.retrainingSchedule ?? "weekly",
        globalMinProfitMarginPercent: args.updates.globalMinProfitMarginPercent ?? 15,
        globalMaxDiscountPercent: args.updates.globalMaxDiscountPercent ?? 50,
        globalMaxDailyPriceChangePercent: args.updates.globalMaxDailyPriceChangePercent ?? 10,
        requireApprovalForHighRisk: args.updates.requireApprovalForHighRisk ?? true,
        globalSafetyStockDays: args.updates.globalSafetyStockDays ?? 14,
        globalExpiryWarningDays: args.updates.globalExpiryWarningDays ?? 30,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(settings._id, {
        ...args.updates,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "UPDATE_AI_SETTINGS",
      details: `Updated global AI operational parameters`,
      timestamp: Date.now(),
    });

    return { success: true };
  }
});
