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
  if (!user || (user.role !== "super_admin" && user.email !== "admin@retailmind.com" && user.email !== "ahmednajahi2003@gmail.com")) {
    throw new Error("Forbidden: Super Admin access required");
  }
  return user;
}

// ── SUPPORT TICKETS ──
export const getPlatformTickets = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    return await ctx.db.query("supportTickets").order("desc").take(200);
  }
});

export const updateTicketStatus = mutation({
  args: {
    token: v.optional(v.string()),
    ticketId: v.id("supportTickets"),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("resolved"), v.literal("closed")),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    
    await ctx.db.patch(args.ticketId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "UPDATE_TICKET",
      details: `Updated support ticket ${args.ticketId} to status ${args.status}`,
      timestamp: Date.now(),
    });

    return { success: true };
  }
});

export const addAdminResponse = mutation({
  args: {
    token: v.optional(v.string()),
    ticketId: v.id("supportTickets"),
    response: v.string(),
    status: v.optional(v.union(v.literal("open"), v.literal("in_progress"), v.literal("resolved"), v.literal("closed"))),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    
    const patch: any = {
      adminResponse: args.response,
      respondedAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (args.status) {
      patch.status = args.status;
    }

    await ctx.db.patch(args.ticketId, patch);

    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "RESPOND_TICKET",
      details: `Responded to support ticket ${args.ticketId}`,
      timestamp: Date.now(),
    });

    return { success: true };
  }
});

// ── NOTIFICATION TEMPLATES ──
export const getTemplates = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    return await ctx.db.query("notificationTemplates").order("desc").collect();
  }
});

export const saveTemplate = mutation({
  args: {
    token: v.optional(v.string()),
    name: v.string(),
    channel: v.union(v.literal("email"), v.literal("sms"), v.literal("in_app")),
    subjectTemplate: v.optional(v.string()),
    bodyTemplate: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    
    const existing = await ctx.db.query("notificationTemplates")
      .withIndex("by_name", q => q.eq("name", args.name))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        channel: args.channel,
        subjectTemplate: args.subjectTemplate,
        bodyTemplate: args.bodyTemplate,
        isActive: args.isActive,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("notificationTemplates", {
        name: args.name,
        channel: args.channel,
        subjectTemplate: args.subjectTemplate,
        bodyTemplate: args.bodyTemplate,
        isActive: args.isActive,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "SAVE_TEMPLATE",
      details: `Saved notification template ${args.name}`,
      timestamp: Date.now(),
    });

    return { success: true };
  }
});

export const toggleTemplateStatus = mutation({
  args: {
    token: v.optional(v.string()),
    templateId: v.id("notificationTemplates"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    await ctx.db.patch(args.templateId, { isActive: args.isActive, updatedAt: Date.now() });
    return { success: true };
  }
});

// ── REPORTS & ANALYTICS ──
export const getPlatformStats = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    
    // In a real production app, these would be aggregations or cached metrics.
    const organizations = await ctx.db.query("organizations").collect();
    const users = await ctx.db.query("users").collect();
    const products = await ctx.db.query("products").collect();
    const pos = await ctx.db.query("purchaseOrders").collect();
    const tickets = await ctx.db.query("supportTickets").collect();

    const activeOrgs = organizations.filter(o => o.isActive).length;
    const totalRevenue = 1250000; // Dummy value since no totalRevenue field
    const mrr = organizations.filter(o => o.subscriptionStatus === "ACTIVE").length * 299; // Dummy MRR calc
    
    const openTickets = tickets.filter(t => t.status === "open").length;
    const pendingPOs = pos.filter(p => p.status === "draft").length;

    return {
      totalTenants: organizations.length,
      activeTenants: activeOrgs,
      totalUsers: users.length,
      totalProducts: products.length,
      totalRevenue,
      mrr,
      openTickets,
      pendingPOs,
    };
  }
});
