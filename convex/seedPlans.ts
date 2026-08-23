import { internalMutation } from "./_generated/server";

export default internalMutation({
  args: {},
  handler: async (ctx) => {
    const plans = [
      {
        name: "Starter",
        tier: "STARTER" as const,
        description: "Essential inventory tracking for single-branch stores getting started.",
        monthlyPriceLkr: 2500,
        yearlyPriceLkr: 25000,
        features: {
          activeSkuLimit: 100,
          storeLimit: 1,
          staffUserLimit: 2,
          aiDemandForecasting: false,
          automatedReorder: false,
          dynamicPricing: false,
          supplierPortal: false,
          fullRbac: false,
        },
        isRecommended: false,
        isActive: true,
      },
      {
        name: "Growth",
        tier: "GROWTH" as const,
        description: "Complete AI demand forecasting & automated replenishment engine.",
        monthlyPriceLkr: 4900,
        yearlyPriceLkr: 49000,
        features: {
          activeSkuLimit: "unlimited" as const,
          storeLimit: 3,
          staffUserLimit: "unlimited" as const,
          aiDemandForecasting: true,
          automatedReorder: true,
          dynamicPricing: true,
          supplierPortal: false,
          fullRbac: false,
        },
        isRecommended: true,
        isActive: true,
      },
      {
        name: "Enterprise",
        tier: "ENTERPRISE" as const,
        description: "For multi-branch supermarket chains & franchise retail networks.",
        monthlyPriceLkr: 0, // 0 for custom pricing
        yearlyPriceLkr: 0,
        features: {
          activeSkuLimit: "unlimited" as const,
          storeLimit: "unlimited" as const,
          staffUserLimit: "unlimited" as const,
          aiDemandForecasting: true,
          automatedReorder: true,
          dynamicPricing: true,
          supplierPortal: true,
          fullRbac: true,
        },
        isRecommended: false,
        isActive: true,
      }
    ];

    for (const plan of plans) {
      const existing = await ctx.db.query("subscriptionPlans")
        .withIndex("by_tier", q => q.eq("tier", plan.tier))
        .first();
        
      if (existing) {
        await ctx.db.patch(existing._id, plan);
      } else {
        await ctx.db.insert("subscriptionPlans", {
          ...plan,
          createdAt: Date.now(),
        });
      }
    }
  }
});
