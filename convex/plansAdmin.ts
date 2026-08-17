import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function requireSuperAdmin(ctx: any, token?: string) {
  if (!token) throw new Error("Unauthorized");
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
  if (!session) throw new Error("Unauthorized");
  
  const user = await ctx.db.get(session.userId);
  if (!user || (user.role !== "super_admin" && user.email !== "admin@retailmind.com")) {
    throw new Error("Forbidden: Super Admin access required");
  }
  return user;
}

export const getPlans = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    return await ctx.db.query("subscriptionPlans").order("desc").collect();
  }
});

export const createPlan = mutation({
  args: {
    token: v.optional(v.string()),
    name: v.string(),
    tier: v.union(v.literal("STARTER"), v.literal("GROWTH"), v.literal("ENTERPRISE")),
    description: v.string(),
    monthlyPriceLkr: v.number(),
    yearlyPriceLkr: v.number(),
    features: v.object({
      activeSkuLimit: v.union(v.number(), v.literal("unlimited")),
      storeLimit: v.union(v.number(), v.literal("unlimited")),
      staffUserLimit: v.union(v.number(), v.literal("unlimited")),
      aiDemandForecasting: v.boolean(),
      automatedReorder: v.boolean(),
      dynamicPricing: v.boolean(),
      supplierPortal: v.boolean(),
      fullRbac: v.boolean(),
    }),
    isRecommended: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    
    // Check if plan with tier already exists
    const existing = await ctx.db.query("subscriptionPlans")
      .withIndex("by_tier", q => q.eq("tier", args.tier))
      .first();
      
    if (existing) {
      throw new Error(`A plan with tier ${args.tier} already exists.`);
    }

    const planId = await ctx.db.insert("subscriptionPlans", {
      name: args.name,
      tier: args.tier,
      description: args.description,
      monthlyPriceLkr: args.monthlyPriceLkr,
      yearlyPriceLkr: args.yearlyPriceLkr,
      features: args.features,
      isRecommended: args.isRecommended,
      isActive: true,
      createdAt: Date.now(),
    });

    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "CREATE_PLAN",
      details: `Created new ${args.tier} plan`,
      timestamp: Date.now(),
    });

    return { planId };
  }
});

export const updatePlan = mutation({
  args: {
    token: v.optional(v.string()),
    planId: v.id("subscriptionPlans"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      monthlyPriceLkr: v.optional(v.number()),
      yearlyPriceLkr: v.optional(v.number()),
      isActive: v.optional(v.boolean()),
      isRecommended: v.optional(v.boolean()),
      features: v.optional(v.object({
        activeSkuLimit: v.union(v.number(), v.literal("unlimited")),
        storeLimit: v.union(v.number(), v.literal("unlimited")),
        staffUserLimit: v.union(v.number(), v.literal("unlimited")),
        aiDemandForecasting: v.boolean(),
        automatedReorder: v.boolean(),
        dynamicPricing: v.boolean(),
        supplierPortal: v.boolean(),
        fullRbac: v.boolean(),
      })),
    })
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");

    await ctx.db.patch(args.planId, args.updates);

    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "UPDATE_PLAN",
      details: `Updated ${plan.tier} plan configurations`,
      timestamp: Date.now(),
    });

    return { success: true };
  }
});
