import { mutation, query, internalQuery } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { isSuperAdminUser, requireSuperAdmin, sanitizeUser } from "./lib/roleGuard";
import { revokeAllUserSessions } from "./authInternal";

// Roles a super admin may assign to tenant users. `super_admin` is never
// assignable through the API (bootstrap via internal authInternal.bootstrapSuperAdmin).
const tenantRole = v.union(
  v.literal("admin"),
  v.literal("manager"),
  v.literal("staff"),
  v.literal("supplier"),
  v.literal("pending"),
);

async function getModifiableTenantUser(ctx: any, admin: any, userId: any) {
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError("User not found");
  if (isSuperAdminUser(user) || user._id === admin._id) {
    throw new ConvexError("Access denied: Super administrator accounts cannot be modified here.");
  }
  return user;
}

export const verifySuperAdminToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return sanitizeUser(await requireSuperAdmin(ctx, args.token));
  },
});

/** Used by actions (superAdminActions) to authorize the caller. */
export const requireSuperAdminInternal = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    return { _id: admin._id, email: admin.email };
  },
});

// ── Super Admin IAM Queries & Mutations ──

export const getAllPlatformUsers = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    const users = await ctx.db.query("users").order("desc").collect();
    
    // Attach organization names
    return await Promise.all(users.map(async (u) => {
      let orgName = "System / No Org";
      if (u.orgId) {
        const org = await ctx.db.get(u.orgId);
        if (org) orgName = org.name;
      }
      return { ...sanitizeUser(u), orgName };
    }));
  }
});

export const updateUserRole = mutation({
  args: {
    token: v.optional(v.string()),
    userId: v.id("users"),
    newRole: tenantRole,
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    const user = await getModifiableTenantUser(ctx, admin, args.userId);

    await ctx.db.patch(args.userId, {
      role: args.newRole,
    });

    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "UPDATE_USER_ROLE",
      targetUserId: args.userId,
      targetOrgId: user.orgId,
      details: `Changed role from ${user.role} to ${args.newRole}`,
      timestamp: Date.now(),
    });

    return { success: true };
  }
});

export const toggleUserStatus = mutation({
  args: {
    token: v.optional(v.string()),
    userId: v.id("users"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    const user = await getModifiableTenantUser(ctx, admin, args.userId);

    await ctx.db.patch(args.userId, {
      isActive: args.isActive,
    });

    // If deactivating, also kill sessions
    if (!args.isActive) {
      await revokeAllUserSessions(ctx, args.userId, "deactivated_by_super_admin");
    }

    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: args.isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      targetUserId: args.userId,
      targetOrgId: user.orgId,
      details: args.isActive ? "Reactivated user account" : "Deactivated user account and revoked sessions",
      timestamp: Date.now(),
    });

    return { success: true };
  }
});

export const updateTenantUser = mutation({
  args: {
    token: v.optional(v.string()),
    userId: v.id("users"),
    name: v.string(),
    email: v.string(),
    role: tenantRole,
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    const user = await getModifiableTenantUser(ctx, admin, args.userId);

    const email = args.email.toLowerCase().trim();
    if (email !== user.email) {
      const clash = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (clash) throw new ConvexError("User with this email already exists");
    }

    await ctx.db.patch(args.userId, {
      name: args.name,
      email,
      role: args.role,
      isActive: args.isActive,
    });

    if (!args.isActive || email !== user.email) {
      await revokeAllUserSessions(ctx, args.userId, "updated_by_super_admin");
    }

    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "UPDATE_USER",
      targetUserId: args.userId,
      targetOrgId: user.orgId,
      details: `Updated user ${args.email}`,
      timestamp: Date.now(),
    });

    return { success: true };
  }
});

export const deleteTenantUser = mutation({
  args: {
    token: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    const user = await getModifiableTenantUser(ctx, admin, args.userId);

    const sessions = await ctx.db.query("sessions")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .collect();
    for (const s of sessions) {
      await ctx.db.delete(s._id);
    }

    await ctx.db.delete(args.userId);

    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "DELETE_USER",
      targetUserId: args.userId,
      targetOrgId: user.orgId,
      details: `Hard deleted user ${user.email}`,
      timestamp: Date.now(),
    });

    return { success: true };
  }
});
