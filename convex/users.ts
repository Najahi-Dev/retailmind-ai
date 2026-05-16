import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Called by webhook — save user to DB
export const syncClerkUser = mutation({
  args: {
    clerkId:  v.string(),
    email:    v.string(),
    name:     v.string(),
    role:     v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("staff"),
      v.literal("supplier")
    ),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q =>
        q.eq("clerkId", args.clerkId)
      )
      .first();

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        email:    args.email,
        name:     args.name,
        role:     args.role,
        isActive: args.isActive,
      });
      return existing._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId:   args.clerkId,
      email:     args.email,
      name:      args.name,
      role:      args.role,
      isActive:  args.isActive,
      createdAt: Date.now(),
    });

    return userId;
  },
});

// Get current logged-in user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q =>
        q.eq("clerkId", identity.subject)
      )
      .first();
  },
});

// Deactivate user (soft delete)
export const deactivateByClerkId = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q =>
        q.eq("clerkId", args.clerkId)
      )
      .first();

    if (user) {
      await ctx.db.patch(user._id, { isActive: false });
    }
  },
});