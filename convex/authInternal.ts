// convex/authInternal.ts
import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

// Query all users
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Query user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Query user by ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Query session by token
export const getSessionByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) return null;

    if (session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user) return null;

    const organization = user.orgId ? await ctx.db.get(user.orgId) : null;

    return { session, user, organization };
  },
});

// Create user record
export const createUserRecord = mutation({
  args: {
    email: v.string(),
    passwordHash: v.optional(v.string()),
    name: v.string(),
    phone: v.optional(v.string()),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("staff"),
      v.literal("supplier"),
      v.literal("pending"),
    ),
    imageUrl: v.optional(v.string()),
    orgId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new ConvexError("User with this email already exists");
    }

    // Default org fallback
    const defaultOrg = await ctx.db.query("organizations").first();
    const finalOrgId = args.orgId || defaultOrg?._id;

    const userId = await ctx.db.insert("users", {
      orgId: finalOrgId,
      email: args.email,
      name: args.name,
      phone: args.phone,
      passwordHash: args.passwordHash,
      role: args.role,
      imageUrl: args.imageUrl,
      isActive: true,
      createdAt: Date.now(),
    });

    if (args.role === "supplier") {
      const cleanEmail = args.email.toLowerCase().trim();
      const allSuppliers = await ctx.db.query("suppliers").collect();
      const existingSupplier = allSuppliers.find(
        (s) => s.email && s.email.toLowerCase().trim() === cleanEmail
      );

      if (existingSupplier) {
        await ctx.db.patch(userId, { supplierId: existingSupplier._id });
        if (!existingSupplier.isActive) {
          await ctx.db.patch(existingSupplier._id, { isActive: true, status: "active" });
        }
      } else {
        const supplierId = await ctx.db.insert("suppliers", {
          orgId: defaultOrg?._id,
          name: args.name,
          email: args.email,
          phone: args.phone,
          leadTimeDays: 3,
          status: "active",
          isActive: true,
          createdAt: Date.now(),
        });
        await ctx.db.patch(userId, { supplierId });
      }
    }

    return userId;
  },
});

// Create session token record
export const createSessionRecord = mutation({
  args: {
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("sessions", {
      userId: args.userId,
      token: args.token,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.userId, {
      lastLogin: Date.now(),
    });
  },
});

// Delete session token record
export const deleteSessionRecord = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

// Update password hash
export const updateUserPassword = mutation({
  args: {
    userId: v.id("users"),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      passwordHash: args.passwordHash,
    });
  },
});

// Update user active status
export const updateUserStatus = mutation({
  args: {
    userId: v.id("users"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      isActive: args.isActive,
    });
  },
});

// Create Organization & Owner User Record
export const createWorkspaceAndOwnerRecord = mutation({
  args: {
    companyName: v.string(),
    slug: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.toLowerCase().trim();
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", cleanEmail))
      .first();

    if (existingUser) {
      throw new ConvexError("An account with this email address already exists. Please sign in instead.");
    }

    const inviteCode = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const orgId = await ctx.db.insert("organizations", {
      name: args.companyName,
      slug: args.slug,
      inviteCode,
      plan: "starter",
      isActive: true,
      isTrialUsed: false,
      createdAt: Date.now(),
    });

    const userId = await ctx.db.insert("users", {
      orgId,
      email: cleanEmail,
      name: args.name,
      phone: args.phone,
      passwordHash: args.passwordHash,
      role: "admin",
      isActive: true,
      createdAt: Date.now(),
      lastLogin: Date.now(),
    });

    await ctx.db.patch(orgId, { ownerId: userId });

    return { userId, orgId, inviteCode };
  },
});
