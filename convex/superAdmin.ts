import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper to authenticate super admin
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

// ── QUERIES ──

export const getAllOrganizations = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    
    // Fetch all orgs
    const orgs = await ctx.db.query("organizations").collect();
    
    // Fetch counts and owners (this could be optimized with aggregations in a production environment)
    const allUsers = await ctx.db.query("users").collect();
    
    const enrichedOrgs = orgs.map((org: any) => {
      const orgUsers = allUsers.filter((u: any) => u.orgId === org._id);
      const owner = orgUsers.find((u: any) => u.role === "admin");
      
      return {
        ...org,
        userCount: orgUsers.length,
        ownerEmail: owner?.email,
        ownerName: owner?.name,
        ownerId: owner?._id,
      };
    });
    
    return enrichedOrgs;
  },
});

export const getPlatformMetrics = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    
    const orgs = await ctx.db.query("organizations").collect();
    const users = await ctx.db.query("users").collect();
    
    const totalOrgs = orgs.length;
    const activeOrgs = orgs.filter((o: any) => ["ACTIVE", "TRIALING", "FREE"].includes(o.subscriptionStatus || "FREE")).length;
    
    const totalUsers = users.length;
    const activeUsers = users.filter((u: any) => u.isActive).length;
    
    // Mock MRR calculation based on active growth/enterprise tiers
    let mrr = 0;
    orgs.forEach((o: any) => {
      if (o.subscriptionStatus === "ACTIVE") {
        if (o.planTier === "GROWTH") mrr += 49;
        if (o.planTier === "ENTERPRISE") mrr += 199;
      }
    });

    return {
      totalOrgs,
      activeOrgs,
      totalUsers,
      activeUsers,
      mrr,
    };
  },
});

export const getSystemAlerts = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    return await ctx.db.query("systemAlerts").order("desc").take(50);
  },
});

export const getGlobalSettings = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    const settings = await ctx.db.query("globalSettings").first();
    return settings || { maintenanceMode: false, globalFeatureFlags: {} };
  },
});

// ── MUTATIONS ──

export const updateOrganizationStatus = mutation({
  args: {
    token: v.optional(v.string()),
    orgId: v.id("organizations"),
    updates: v.object({
      planTier: v.optional(v.union(v.literal("STARTER"), v.literal("GROWTH"), v.literal("ENTERPRISE"))),
      subscriptionStatus: v.optional(v.union(v.literal("FREE"), v.literal("TRIALING"), v.literal("ACTIVE"), v.literal("PAST_DUE"), v.literal("CANCELED"))),
    }),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    
    await ctx.db.patch(args.orgId, {
      ...args.updates,
    });
    
    // Log audit
    await ctx.db.insert("securityLogs", {
      userId: admin._id,
      email: admin.email,
      role: "super_admin",
      eventType: "ORG_UPDATE",
      details: `Updated org ${args.orgId} with ${JSON.stringify(args.updates)}`,
      createdAt: Date.now(),
    });
    
    return { success: true };
  },
});

export const toggleMaintenanceMode = mutation({
  args: {
    token: v.optional(v.string()),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    
    const settings = await ctx.db.query("globalSettings").first();
    if (settings) {
      await ctx.db.patch(settings._id, { maintenanceMode: args.enabled, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("globalSettings", { maintenanceMode: args.enabled, globalFeatureFlags: {}, updatedAt: Date.now() });
    }
    
    // Log audit
    await ctx.db.insert("securityLogs", {
      userId: admin._id,
      email: admin.email,
      role: "super_admin",
      eventType: "MAINTENANCE_TOGGLE",
      details: `Set maintenance mode to ${args.enabled}`,
      createdAt: Date.now(),
    });
    
    return { success: true };
  },
});

export const generateImpersonationToken = mutation({
  args: {
    token: v.optional(v.string()),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    
    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) throw new Error("Target user not found");
    
    // Find an existing session or create a new temporary one
    let targetSession = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("userId"), args.targetUserId))
      .first();
      
    if (!targetSession) {
      const newToken = crypto.randomUUID();
      await ctx.db.insert("sessions", {
        userId: args.targetUserId,
        token: newToken,
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60 * 24, // 1 day
      });
      return { token: newToken, user: targetUser };
    }
    
    return { token: targetSession.token, user: targetUser };
  },
});
