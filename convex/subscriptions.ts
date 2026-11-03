import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCallerUser, requireCallerOrg, requireSuperAdmin } from "./lib/roleGuard";

// ── Get Subscription for Current User ─────────────
export const getUserSubscription = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    if (!caller || !caller.orgId) {
      return {
        userPlan: "starter",
        planTier: "STARTER",
        subscriptionStatus: "FREE",
        isVipAccess: false,
        organization: null,
      };
    }

    const org: any = await ctx.db.get(caller.orgId);
    const planTier = org?.planTier ?? (org?.plan ? (org.plan.toUpperCase() as any) : "STARTER");
    const subscriptionStatus = org?.subscriptionStatus ?? "FREE";

    return {
      userPlan: org?.plan || "starter",
      planTier,
      subscriptionStatus,
      isVipAccess: caller.role === "admin",
      organization: org,
    };
  },
});

// ── Check Plan Features Access & Product Limit ─────
export const checkFeatureAccess = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    if (!caller || !caller.orgId) {
      return {
        plan: "starter",
        planTier: "STARTER",
        subscriptionStatus: "FREE",
        maxProducts: 100,
        canAccessForecasting: false,
        canAccessPricingEngine: false,
        canAccessReorders: false,
        canAccessReorderSuggestions: false,
        canAccessPOManagement: true,
        canAccessSupplierPortal: true,
        productCount: 0,
        hasReachedLimit: false,
      };
    }

    const org: any = await ctx.db.get(caller.orgId);
    const planTier = (org?.planTier ?? (org?.plan ? org.plan.toUpperCase() : "STARTER")) as "STARTER" | "GROWTH" | "ENTERPRISE";
    const rawStatus = (org?.subscriptionStatus ?? "FREE").toUpperCase();

    const isPaidActive = ["ACTIVE", "TRIALING", "TRIAL"].includes(rawStatus);

    const allProducts = await ctx.db.query("products").collect();
    const orgProducts = allProducts.filter((p) => p.orgId === caller.orgId);
    const productCount = orgProducts.length;

    if (planTier === "STARTER" || !isPaidActive) {
      return {
        plan: "starter",
        planTier: "STARTER",
        subscriptionStatus: rawStatus,
        maxProducts: 100,
        canAccessForecasting: false,
        canAccessPricingEngine: false,
        canAccessReorders: false,
        canAccessReorderSuggestions: false,
        canAccessPOManagement: true,
        canAccessSupplierPortal: true,
        productCount,
        hasReachedLimit: productCount >= 100,
      };
    }

    const isEnterprise = planTier === "ENTERPRISE";

    return {
      plan: planTier.toLowerCase(),
      planTier,
      subscriptionStatus: rawStatus,
      maxProducts: Infinity,
      canAccessForecasting: true,
      canAccessPricingEngine: true,
      canAccessReorders: true,
      canAccessReorderSuggestions: true,
      canAccessPOManagement: true,
      canAccessSupplierPortal: true,
      canAccessMultiLocationSync: isEnterprise,
      canAccessCustomPOS: isEnterprise,
      productCount,
      hasReachedLimit: false,
    };
  },
});

// ── Check Product Creation Limit Before Insert ──────
export const checkProductLimit = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    if (!caller || !caller.orgId) return { allowed: false, reason: "No active workspace." };

    const org: any = await ctx.db.get(caller.orgId);
    const planTier = (org?.planTier ?? (org?.plan ? org.plan.toUpperCase() : "STARTER")) as "STARTER" | "GROWTH" | "ENTERPRISE";
    const rawStatus = (org?.subscriptionStatus ?? "FREE").toUpperCase();
    const isPaidActive = ["ACTIVE", "TRIALING", "TRIAL"].includes(rawStatus);

    if (planTier === "STARTER" || !isPaidActive) {
      const allProducts = await ctx.db.query("products").collect();
      const orgCount = allProducts.filter((p) => p.orgId === caller.orgId).length;
      if (orgCount >= 100) {
        return {
          allowed: false,
          reason: "Starter Plan limit reached (100 SKUs max). Upgrade to Growth Plan for unlimited SKUs & AI forecasting.",
          currentCount: orgCount,
          maxLimit: 100,
        };
      }
    }

    return { allowed: true, currentCount: 0, maxLimit: Infinity };
  },
});

export const grantVipAccess = mutation({
  args: {
    targetUserId: v.string(),
    isVipAccess: v.boolean(),
    grantedPlan: v.optional(v.union(v.literal("growth"), v.literal("enterprise"))),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Legacy no-op kept for API compatibility; restricted to super admins.
    await requireSuperAdmin(ctx, args.token);
    return { success: true };
  },
});

export const cancelSubscriptionAtPeriodEnd = mutation({
  args: { userId: v.optional(v.string()), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Legacy no-op (cancellation is handled through the Stripe billing portal);
    // restricted to workspace administrators.
    await requireCallerOrg(ctx, args.token, ["admin"]);
    return { success: true };
  },
});
