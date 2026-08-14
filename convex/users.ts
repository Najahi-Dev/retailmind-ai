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

// Auto-provision or update logged-in Clerk user in Convex database
export const storeUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    const name =
      identity.name ||
      `${identity.givenName ?? ""} ${identity.familyName ?? ""}`.trim() ||
      identity.email ||
      "User";
    const email = identity.email ?? "";

    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        email: email || existing.email,
      });
      return existing._id;
    }

    const allUsers = await ctx.db.query("users").collect();
    const hasAdmin = allUsers.some((u) => u.role === "admin");
    const role = !hasAdmin ? "admin" : "staff";

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email,
      name,
      role,
      isActive: true,
      plan: "starter",
      createdAt: Date.now(),
    });

    return userId;
  },
});

// Get all users for admin management
export const getUsers = query({
  args: {
    role: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let users = await ctx.db.query("users").collect();

    if (args.role && args.role !== "all") {
      users = users.filter(u => u.role === args.role);
    }

    if (args.status && args.status !== "all") {
      const isActive = args.status === "active";
      users = users.filter(u => u.isActive === isActive);
    }

    return users.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get User Analytics & Role Stats
export const getUserStats = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const total = users.length;
    const adminCount = users.filter(u => u.role === "admin").length;
    const managerCount = users.filter(u => u.role === "manager").length;
    const staffCount = users.filter(u => u.role === "staff").length;
    const supplierCount = users.filter(u => u.role === "supplier").length;
    const activeCount = users.filter(u => u.isActive).length;
    const inactiveCount = total - activeCount;

    return {
      total,
      adminCount,
      managerCount,
      staffCount,
      supplierCount,
      activeCount,
      inactiveCount,
    };
  },
});

// Update User Role
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("staff"),
      v.literal("supplier")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

// Toggle User Active Status
export const toggleUserStatus = mutation({
  args: {
    userId: v.id("users"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { isActive: args.isActive });
  },
});

// Update Subscription Plan
export const updateUserPlan = mutation({
  args: {
    userId: v.id("users"),
    plan: v.union(v.literal("starter"), v.literal("growth"), v.literal("enterprise")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { plan: args.plan });
  },
});

// Create Manual User Record
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("staff"),
      v.literal("supplier")
    ),
    plan: v.optional(v.union(v.literal("starter"), v.literal("growth"), v.literal("enterprise"))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), args.email))
      .first();

    if (existing) {
      throw new Error(`User with email ${args.email} already exists`);
    }

    const userId = await ctx.db.insert("users", {
      clerkId: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: args.email,
      name: args.name,
      role: args.role,
      isActive: true,
      plan: args.plan ?? "starter",
      createdAt: Date.now(),
    });

    return userId;
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

// Get user detail by ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Full update of user detail
export const updateUserFullDetail = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("staff"),
      v.literal("supplier")
    ),
    plan: v.union(v.literal("starter"), v.literal("growth"), v.literal("enterprise")),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User record not found");

    await ctx.db.patch(args.userId, {
      name: args.name,
      imageUrl: args.imageUrl ?? user.imageUrl,
      role: args.role,
      plan: args.plan,
      isActive: args.isActive,
    });

    return { success: true, clerkId: user.clerkId };
  },
});

// Generate Convex File Upload URL for Profile Images
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Update Profile Image URL by Storage ID or Direct URL
export const updateUserProfileImage = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let finalUrl = args.imageUrl;
    if (args.storageId) {
      const url = await ctx.storage.getUrl(args.storageId);
      if (url) finalUrl = url;
    }

    if (!finalUrl) throw new Error("No valid profile image provided");

    await ctx.db.patch(args.userId, {
      imageUrl: finalUrl,
    });

    return { success: true, imageUrl: finalUrl };
  },
});