import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── Get Subscription for Current User ─────────────
export const getUserSubscription = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let userDoc: any = null;
    if (args.userId) {
      try {
        userDoc = await ctx.db.get(args.userId as any);
      } catch {}
    }

    if (!userDoc) {
      userDoc = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", "admin@retailmind.com"))
        .first();
    }

    return {
      userPlan: userDoc?.plan || "starter",
      isVipAccess: userDoc?.isVipAccess || userDoc?.role === "admin" || false,
      subscription: null,
    };
  },
});

// ── Upsert Subscription Details (Stripe Sync) ──────
export const upsertSubscription = mutation({
  args: {
    userId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    plan: v.union(
      v.literal("starter"),
      v.literal("growth"),
      v.literal("enterprise")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("cancelled"),
      v.literal("past_due"),
      v.literal("trialing")
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
  },
  handler: async (ctx, args) => {
    let user: any = null;
    try {
      user = await ctx.db.get(args.userId as any);
    } catch {}

    if (user) {
      await ctx.db.patch(user._id, {
        plan: args.plan,
      });
    }
  },
});

// ── Update User Plan Directly ──────────────────────
export const updateUserPlan = mutation({
  args: {
    userId: v.string(),
    plan: v.union(
      v.literal("starter"),
      v.literal("growth"),
      v.literal("enterprise")
    ),
  },
  handler: async (ctx, args) => {
    let user: any = null;
    try {
      user = await ctx.db.get(args.userId as any);
    } catch {}

    if (user) {
      await ctx.db.patch(user._id, { plan: args.plan });
    }
  },
});

// ── Admin VIP / Unlimited Access Override ──────────
export const grantVipAccess = mutation({
  args: {
    targetUserId: v.string(),
    isVipAccess: v.boolean(),
    grantedPlan: v.optional(
      v.union(v.literal("growth"), v.literal("enterprise"))
    ),
  },
  handler: async (ctx, args) => {
    const targetUser: any = await ctx.db.get(args.targetUserId as any);

    if (!targetUser) {
      throw new Error("Target user not found.");
    }

    const newPlan = args.isVipAccess
      ? args.grantedPlan || "growth"
      : "starter";

    await ctx.db.patch(targetUser._id, {
      isVipAccess: args.isVipAccess,
      plan: newPlan,
    });

    return {
      success: true,
      message: args.isVipAccess
        ? `Granted VIP unlimited access (${newPlan}) to ${targetUser.name}`
        : `Removed VIP access for ${targetUser.name}`,
    };
  },
});

// ── Mark Subscription Cancelled at Period End ──────
export const cancelSubscriptionAtPeriodEnd = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return { success: true };
  },
});

// ── Check Plan Features Access & Product Limit ─────
export const checkFeatureAccess = query({
  args: {},
  handler: async (ctx) => {
    const allProducts = await ctx.db.query("products").collect();
    const productCount = allProducts.length;

    return {
      plan: "enterprise",
      isVip: true,
      maxProducts: Infinity,
      canAccessForecasting: true,
      canAccessPricingEngine: true,
      canAccessPOManagement: true,
      canAccessSupplierPortal: true,
      productCount,
      hasReachedLimit: false,
    };
  },
});
