import { mutation, query } from "./_generated/server";
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
      return { ...u, orgName };
    }));
  }
});

export const updateUserRole = mutation({
  args: {
    token: v.optional(v.string()),
    userId: v.id("users"),
    newRole: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.userId, {
      role: args.newRole as any,
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
    
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(args.userId, {
      isActive: args.isActive,
    });

    // If deactivating, also kill sessions
    if (!args.isActive) {
      const sessions = await ctx.db.query("sessions")
        .withIndex("by_user", q => q.eq("userId", args.userId))
        .collect();
      
      for (const s of sessions) {
        await ctx.db.delete(s._id);
      }
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
