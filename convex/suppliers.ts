import { query } from "./_generated/server";

export const getActiveSuppliers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("suppliers")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});
