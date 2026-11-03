import { internalMutation } from "./_generated/server";

// INTERNAL ONLY (CLI: npx convex run reactivateOrgs)
export default internalMutation({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect();
    for (const org of orgs) {
      if (org.isActive === false) {
        await ctx.db.patch(org._id, { isActive: true });
      }
    }
  },
});
