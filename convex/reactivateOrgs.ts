import { mutation } from "./_generated/server";

export default mutation(async (ctx) => {
  const orgs = await ctx.db.query("organizations").collect();
  for (const org of orgs) {
    if (org.isActive === false) {
      await ctx.db.patch(org._id, { isActive: true });
    }
  }
});
