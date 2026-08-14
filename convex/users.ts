import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";

// Get all users for admin management
export const getUsers = query({
  args: {
    role: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let users = await ctx.db.query("users").collect();

    if (args.role && args.role !== "all") {
      users = users.filter((u) => u.role === args.role);
    }

    if (args.status && args.status !== "all") {
      const isActive = args.status === "active";
      users = users.filter((u) => u.isActive === isActive);
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
    const adminCount = users.filter((u) => u.role === "admin").length;
    const managerCount = users.filter((u) => u.role === "manager").length;
    const staffCount = users.filter((u) => u.role === "staff").length;
    const supplierCount = users.filter((u) => u.role === "supplier").length;
    const pendingCount = users.filter((u) => u.role === "pending").length;
    const activeCount = users.filter((u) => u.isActive).length;
    const inactiveCount = total - activeCount;

    return {
      total,
      adminCount,
      managerCount,
      staffCount,
      supplierCount,
      pendingCount,
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
      v.literal("supplier"),
      v.literal("pending")
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

// Create User Record
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.optional(v.string()),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("staff"),
      v.literal("supplier"),
      v.literal("pending")
    ),
    plan: v.optional(v.union(v.literal("starter"), v.literal("growth"), v.literal("enterprise"))),
  },
  handler: async (ctx, args) => {
    const emailClean = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", emailClean))
      .first();

    if (existing) {
      throw new Error(`User with email ${args.email} already exists`);
    }

    const rawPassword = args.password && args.password.trim() ? args.password : "retailmind123";
    const passwordHash = bcrypt.hashSync(rawPassword, 12);

    const userId = await ctx.db.insert("users", {
      email: emailClean,
      name: args.name.trim(),
      passwordHash,
      role: args.role,
      isActive: true,
      plan: args.plan ?? "starter",
      createdAt: Date.now(),
    });

    return userId;
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
      v.literal("supplier"),
      v.literal("pending")
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

    return { success: true };
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