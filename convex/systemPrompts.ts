import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function requireSuperAdmin(ctx: any, token?: string) {
  if (!token) throw new Error("Unauthorized");
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
  if (!session) throw new Error("Unauthorized");
  
  const user = await ctx.db.get(session.userId);
  if (!user || (user.role !== "super_admin" && user.email !== "admin@retailmind.com")) {
    throw new Error("Forbidden: Super Admin access required");
  }
  return user;
}

export const getSystemPrompts = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    return await ctx.db.query("systemPrompts").collect();
  }
});

export const getActivePrompt = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    // Public query for the backend/AI service to fetch the current prompt
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
