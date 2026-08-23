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
    const activeOrgs = orgs.filter((o: any) => ["ACTIVE", "TRIALING", "FREE", "active", "trial"].includes(o.subscriptionStatus || "FREE")).length;
    
    const totalUsers = users.length;
    const activeUsers = users.filter((u: any) => u.isActive).length;
    
    // Calculate current MRR
    let mrr = 0;
    orgs.forEach((o: any) => {
      const status = o.subscriptionStatus || "FREE";
      if (["ACTIVE", "active", "trial", "TRIALING"].includes(status)) {
        if (o.planTier === "GROWTH") mrr += 49;
        if (o.planTier === "ENTERPRISE") mrr += 199;
      }
    });

    // Generate chart data based on organization creation dates (last 7 months)
    const chartData = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString('default', { month: 'short' });
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59).getTime();
      
      let monthMrr = 0;
      let monthTenants = 0;
      
      orgs.forEach((o: any) => {
        if (o.createdAt <= endOfMonth) {
          monthTenants++;
          const status = o.subscriptionStatus || "FREE";
          if (["ACTIVE", "active", "trial", "TRIALING"].includes(status)) {
            if (o.planTier === "GROWTH") monthMrr += 49;
            if (o.planTier === "ENTERPRISE") monthMrr += 199;
          }
        }
      });
      
      chartData.push({
        name: monthName,
        revenue: monthMrr,
        tenants: monthTenants,
      });
    }

    // Generate system health from alerts
    const alerts = await ctx.db.query("systemAlerts").filter(q => q.eq(q.field("resolved"), false)).collect();
    const isDegraded = (source: string) => alerts.some(a => a.source.toLowerCase().includes(source.toLowerCase()));
    
    const systemHealth = [
      { service: "Convex Database", status: isDegraded("database") ? "Degraded" : "Operational", uptime: isDegraded("database") ? "98.2%" : "99.99%" },
      { service: "AI Demand Engine", status: isDegraded("ai") || isDegraded("llm") ? "Degraded" : "Operational", uptime: isDegraded("ai") ? "97.5%" : "99.95%" },
      { service: "Stripe Billing", status: isDegraded("billing") || isDegraded("stripe") ? "Degraded" : "Operational", uptime: isDegraded("billing") ? "99.0%" : "100%" },
      { service: "Notification Service", status: isDegraded("notification") ? "Degraded" : "Operational", uptime: isDegraded("notification") ? "95.0%" : "99.9%" },
    ];

    // Fetch recent activity from audit logs
    const auditLogs = await ctx.db.query("adminAuditLogs").order("desc").take(5);
    const recentActivity = auditLogs.map(log => {
      // Calculate time ago
      const diffMs = Date.now() - log.timestamp;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      let timeAgo = "Just now";
      if (diffDays > 0) timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      else if (diffHours > 0) timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      else if (diffMins > 0) timeAgo = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      
      let target = "System";
      if (log.targetOrgId) {
        const org = orgs.find((o: any) => o._id === log.targetOrgId);
        target = org ? org.name : `Org ${log.targetOrgId.substring(0, 5)}...`;
      }
      if (log.targetUserId) {
        const user = users.find((u: any) => u._id === log.targetUserId);
        target = user ? user.name : `User ${log.targetUserId.substring(0, 5)}...`;
      }

      return {
        time: timeAgo,
        event: log.action.replace(/_/g, ' ') + (log.details ? `: ${log.details}` : ''),
        target: target,
      };
    });

    return {
      totalOrgs,
      activeOrgs,
      totalUsers,
      activeUsers,
      mrr,
      chartData,
      systemHealth,
      recentActivity,
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

export const getAuditLogs = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    const logs = await ctx.db.query("adminAuditLogs")
      .order("desc")
      .take(500); // Take the latest 500 audit logs
      
    // Fetch orgs and users to map names
    const orgs = await ctx.db.query("organizations").collect();
    const users = await ctx.db.query("users").collect();

    return logs.map(log => {
      let targetName = "System";
      if (log.targetOrgId) {
        const org = orgs.find((o: any) => o._id === log.targetOrgId);
        targetName = org ? org.name : `Org ${log.targetOrgId.substring(0, 5)}...`;
      }
      if (log.targetUserId) {
        const user = users.find((u: any) => u._id === log.targetUserId);
        targetName = user ? user.name : `User ${log.targetUserId.substring(0, 5)}...`;
      }
      
      return {
        ...log,
        targetName,
      };
    });
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
      limits: v.optional(v.object({
        maxSkus: v.number(),
        maxApi: v.number(),
        maxBranches: v.number(),
      })),
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
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    
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
      targetSession = { token: newToken } as any;
    }
    
    // Log audit
    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "IMPERSONATE",
      targetUserId: args.targetUserId,
      targetOrgId: targetUser.orgId,
      details: `Reason: ${args.reason}`,
      timestamp: Date.now(),
    });

    return { token: targetSession!.token, user: targetUser };
  },
});

export const cloneTenantDatabase = mutation({
  args: {
    token: v.optional(v.string()),
    sourceOrgId: v.id("organizations"),
    targetOrgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    
    // Get source org data
    const sourceLocations = await ctx.db.query("locations").withIndex("by_org", q => q.eq("orgId", args.sourceOrgId)).collect();
    const sourceCategories = await ctx.db.query("categories").withIndex("by_org", q => q.eq("orgId", args.sourceOrgId)).collect();
    const sourceProducts = await ctx.db.query("products").withIndex("by_org", q => q.eq("orgId", args.sourceOrgId)).collect();
    
    // Create new locations mapping
    const locationMapping: Record<string, any> = {};
    for (const loc of sourceLocations) {
      const newLocId = await ctx.db.insert("locations", {
        orgId: args.targetOrgId,
        name: loc.name,
        address: loc.address,
        type: loc.type,
        isActive: true,
        createdAt: Date.now(),
      });
      locationMapping[loc._id] = newLocId;
    }

    // Create new categories mapping
    const categoryMapping: Record<string, any> = {};
    for (const cat of sourceCategories) {
      const newCatId = await ctx.db.insert("categories", {
        orgId: args.targetOrgId,
        name: cat.name,
        description: cat.description,
        createdAt: Date.now(),
      });
      categoryMapping[cat._id] = newCatId;
    }

    // Clone products
    for (const prod of sourceProducts) {
      await ctx.db.insert("products", {
        orgId: args.targetOrgId,
        name: prod.name,
        sku: prod.sku + "-CLONED", // Prevent SKU collision just in case
        barcode: prod.barcode ? prod.barcode + "-CLONED" : undefined,
        description: prod.description,
        categoryId: prod.categoryId && categoryMapping[prod.categoryId] ? categoryMapping[prod.categoryId] : undefined,
        unit: prod.unit,
        costPrice: prod.costPrice,
        sellingPrice: prod.sellingPrice,
        reorderPoint: prod.reorderPoint,
        safetyStock: prod.safetyStock,
        trackBatches: prod.trackBatches,
        isActive: prod.isActive,
        minStockLevel: prod.minStockLevel,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "CLONE_TENANT",
      targetOrgId: args.targetOrgId,
      details: `Cloned data from ${args.sourceOrgId} to ${args.targetOrgId}`,
      timestamp: Date.now(),
    });

    return { success: true };
  }
});

// ── Security & Forensics ───────────────────────

export const globalKillSwitch = mutation({
  args: {
    token: v.optional(v.string()),
    targetOrgId: v.optional(v.id("organizations")),
    targetUserId: v.optional(v.id("users")),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);

    // Revoke sessions
    let sessionsToRevoke = [];

    if (args.targetUserId) {
      sessionsToRevoke = await ctx.db.query("sessions")
        .withIndex("by_user", q => q.eq("userId", args.targetUserId!))
        .collect();
    } else if (args.targetOrgId) {
      const usersInOrg = await ctx.db.query("users")
        .withIndex("by_org", q => q.eq("orgId", args.targetOrgId!))
        .collect();
        
      for (const user of usersInOrg) {
        const userSessions = await ctx.db.query("sessions")
          .withIndex("by_user", q => q.eq("userId", user._id))
          .collect();
        sessionsToRevoke.push(...userSessions);
      }
    } else {
      throw new Error("Must provide either targetOrgId or targetUserId");
    }

    // Delete the sessions to instantly log out the targeted users
    for (const session of sessionsToRevoke) {
      await ctx.db.delete(session._id);
    }

    await ctx.db.insert("securityEvents", {
      orgId: args.targetOrgId,
      userId: args.targetUserId,
      eventType: "KILL_SWITCH_ACTIVATED",
      description: `Kill switch activated by Admin ${admin.email}. Reason: ${args.reason}`,
      severity: "critical",
      resolved: false,
      timestamp: Date.now(),
    });

    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "KILL_SWITCH",
      targetOrgId: args.targetOrgId,
      targetUserId: args.targetUserId,
      details: args.reason,
      timestamp: Date.now(),
    });

    return { success: true, revokedCount: sessionsToRevoke.length };
  }
});

export const getSecurityEvents = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    return await ctx.db.query("securityEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(100);
  }
});

export const resolveSecurityEvent = mutation({
  args: {
    token: v.optional(v.string()),
    eventId: v.id("securityEvents"),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    await ctx.db.patch(args.eventId, { resolved: true });
    return { success: true };
  }
});

// ── Infrastructure & Banners ───────────────────

export const getSystemBanners = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    return await ctx.db.query("systemBanners")
      .order("desc")
      .collect();
  }
});

export const getActiveBanners = query({
  args: {},
  handler: async (ctx) => {
    // Public query for all users to see active banners
    return await ctx.db.query("systemBanners")
      .withIndex("by_active", q => q.eq("isActive", true))
      .collect();
  }
});

export const createSystemBanner = mutation({
  args: {
    token: v.optional(v.string()),
    message: v.string(),
    type: v.union(v.literal("info"), v.literal("warning"), v.literal("error")),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    await ctx.db.insert("systemBanners", {
      message: args.message,
      type: args.type,
      isActive: true,
      createdAt: Date.now(),
    });
    return { success: true };
  }
});

export const toggleSystemBanner = mutation({
  args: {
    token: v.optional(v.string()),
    bannerId: v.id("systemBanners"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    await ctx.db.patch(args.bannerId, { isActive: args.isActive });
    return { success: true };
  }
});
