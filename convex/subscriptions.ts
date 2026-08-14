import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── Get Subscription for Current User ─────────────
export const getUserSubscription = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let targetClerkId = args.clerkId;

    if (!targetClerkId) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return null;
      targetClerkId = identity.subject;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", targetClerkId!))
      .first();

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", targetClerkId!))
      .first();

    return {
      userPlan: user?.plan || "starter",
      isVipAccess: user?.isVipAccess || user?.role === "admin" || false,
      subscription: subscription || null,
    };
  },
});

// ── Upsert Subscription Details (Stripe Sync) ──────
export const upsertSubscription = mutation({
  args: {
    clerkId: v.string(),
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
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        plan: args.plan,
        status: args.status,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        clerkId: args.clerkId,
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        plan: args.plan,
        status: args.status,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Also update user.plan in users table
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

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
    clerkId: v.string(),
    plan: v.union(
      v.literal("starter"),
      v.literal("growth"),
      v.literal("enterprise")
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, { plan: args.plan });
    }
  },
});

// ── Admin VIP / Unlimited Access Override ──────────
export const grantVipAccess = mutation({
  args: {
    targetClerkId: v.string(),
    isVipAccess: v.boolean(),
    grantedPlan: v.optional(
      v.union(v.literal("growth"), v.literal("enterprise"))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in.");
    }

    // Verify current user is an Admin
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Forbidden: Only Administrators can grant VIP access.");
    }

    // Find target user
    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.targetClerkId))
      .first();

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
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (subscription) {
      await ctx.db.patch(subscription._id, {
        cancelAtPeriodEnd: true,
        updatedAt: Date.now(),
      });
    }
  },
});

// ── Check Plan Features Access & Product Limit ─────
export const checkFeatureAccess = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        plan: "starter",
        isVip: false,
        maxProducts: 100,
        canAccessForecasting: false,
        canAccessPricingEngine: false,
        canAccessPOManagement: false,
        canAccessSupplierPortal: false,
        productCount: 0,
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    const isVip = user?.isVipAccess || user?.role === "admin" || false;
    const plan = user?.plan || "starter";

    const allProducts = await ctx.db.query("products").collect();
    const productCount = allProducts.length;

    const isGrowthOrBetter =
      isVip || plan === "growth" || plan === "enterprise";

    return {
      plan,
      isVip,
      maxProducts: isGrowthOrBetter ? Infinity : 100,
      canAccessForecasting: isGrowthOrBetter,
      canAccessPricingEngine: isGrowthOrBetter,
      canAccessPOManagement: isGrowthOrBetter,
      canAccessSupplierPortal: isGrowthOrBetter,
      productCount,
      hasReachedLimit: !isGrowthOrBetter && productCount >= 100,
    };
  },
});
