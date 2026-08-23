import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Internal query to securely fetch the template without exposing it to the client directly
export const getTemplateByName = internalQuery({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("notificationTemplates")
      .withIndex("by_name", q => q.eq("name", args.name))
      .first();
  }
});
