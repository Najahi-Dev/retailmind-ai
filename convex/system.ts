// Force re-sync
import { query } from "./_generated/server";

export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("globalSettings").first();
    return {
      maintenanceMode: settings?.maintenanceMode || false,
      updatedAt: settings?.updatedAt || Date.now(),
    };
  },
});
