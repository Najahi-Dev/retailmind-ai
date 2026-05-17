import { query } from "./_generated/server";

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_active", q => q.eq("isDismissed", false))
      .collect();

    return {
      total:    alerts.length,
      critical: alerts.filter(a => a.priority === "critical").length,
      unread:   alerts.filter(a => !a.isRead).length,
    };
  },
});