import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSuperAdmin } from "./lib/roleGuard";


// Internal only: called by trusted backend code (never by clients) so callers cannot
// forge usage/cost records for arbitrary organizations.
export const logAiUsage = internalMutation({
  args: {
    orgId: v.optional(v.id("organizations")),
    model: v.string(),
    action: v.string(),
    tokensIn: v.number(),
    tokensOut: v.number(),
    costUsd: v.number(),
    latencyMs: v.optional(v.number()),
    isFallback: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiUsageLogs", {
      ...args,
      timestamp: Date.now(),
    });
    return { success: true };
  }
});

export const getAiTelemetry = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    
    // Fetch last 1000 logs for analytics
    const logs = await ctx.db.query("aiUsageLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(1000);
      
    // Calculate total cost and tokens
    let totalCost = 0;
    let totalTokens = 0;
    const orgCosts: Record<string, number> = {};
    const modelUsage: Record<string, number> = {};
    
    logs.forEach(log => {
      totalCost += log.costUsd;
      totalTokens += (log.tokensIn + log.tokensOut);
      
      const orgId = log.orgId || "unassigned";
      orgCosts[orgId] = (orgCosts[orgId] || 0) + log.costUsd;
      
      modelUsage[log.model] = (modelUsage[log.model] || 0) + 1;
    });

    return {
      logs,
      metrics: {
        totalCost,
        totalTokens,
        orgCosts,
        modelUsage,
        totalCalls: logs.length
      }
    };
  }
});
