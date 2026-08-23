import { query } from "./_generated/server";

export const getStuff = query({
  args: {},
  handler: async (ctx) => {
    const suppliers = await ctx.db.query("suppliers").take(5);
    const pos = await ctx.db.query("purchaseOrders").take(5);
    return { suppliers, pos };
  }
});
