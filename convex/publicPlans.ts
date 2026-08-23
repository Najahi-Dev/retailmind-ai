import { query } from "./_generated/server";

export const getActivePlans = query({
  args: {},
  handler: async (ctx) => {
    const plans = await ctx.db.query("subscriptionPlans")
      .filter(q => q.eq(q.field("isActive"), true))
      .collect();
      
    // Sort by price, custom (0) goes last
    return plans.sort((a, b) => {
      if (a.monthlyPriceLkr === 0) return 1;
      if (b.monthlyPriceLkr === 0) return -1;
      return a.monthlyPriceLkr - b.monthlyPriceLkr;
    });
  }
});
