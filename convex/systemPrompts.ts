import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireSuperAdmin } from "./lib/roleGuard";


export const getSystemPrompts = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    return await ctx.db.query("systemPrompts").collect();
  }
});

export const getActivePrompt = internalQuery({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    // Internal only: prompts are platform IP; fetch from trusted backend code.
    return await ctx.db.query("systemPrompts")
      .withIndex("by_name", (q: any) => q.eq("name", args.name))
      .first();
  }
});

export const saveSystemPrompt = mutation({
  args: {
    token: v.optional(v.string()),
    id: v.optional(v.id("systemPrompts")),
    name: v.string(),
    description: v.optional(v.string()),
    systemPrompt: v.string(),
    userPromptTemplate: v.optional(v.string()),
    defaultModel: v.string(),
    fallbackModel: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    const { token, id, ...promptData } = args;

    if (id) {
      await ctx.db.patch(id, {
        ...promptData,
        updatedAt: Date.now(),
      });
    } else {
      // Ensure name is unique
      const existing = await ctx.db.query("systemPrompts")
        .withIndex("by_name", (q: any) => q.eq("name", args.name))
        .first();
        
      if (existing) {
        throw new Error("Prompt name already exists");
      }
      
      await ctx.db.insert("systemPrompts", {
        ...promptData,
        updatedAt: Date.now(),
      });
    }

    // Log the prompt update
    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "UPDATE_PROMPT",
      details: `Updated prompt: ${args.name}`,
      timestamp: Date.now(),
    });

    return { success: true };
  }
});
