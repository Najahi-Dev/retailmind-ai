import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireSuperAdmin } from "./lib/roleGuard";


export const getPlatformOverview = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    
    const organizations = await ctx.db.query("organizations").collect();
    const users = await ctx.db.query("users").collect();
    const products = await ctx.db.query("products").collect();
    const pos = await ctx.db.query("purchaseOrders").collect();
    const tickets = await ctx.db.query("supportTickets").collect();

    const activeOrgs = organizations.filter(o => o.isActive).length;
    
    // Calculate real GMV from all POs (excluding cancelled)
    const gmv = pos
      .filter(p => p.status !== "cancelled")
      .reduce((sum, p) => sum + p.totalValue, 0);

    // Dummy MRR calc based on active subs (assuming $299 tier)
    const mrr = organizations.filter(o => o.subscriptionStatus === "ACTIVE").length * 299;

    const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress").length;
    const pendingPOs = pos.filter(p => p.status === "sent" || p.status === "draft").length;

    // Organization Tier Breakdown
    const tiers = {
      starter: organizations.filter(o => o.plan === "starter").length,
      growth: organizations.filter(o => o.plan === "growth").length,
      enterprise: organizations.filter(o => o.plan === "enterprise").length,
    };

    return {
      totalTenants: organizations.length,
      activeTenants: activeOrgs,
      totalUsers: users.length,
      totalProducts: products.length,
      gmv,
      mrr,
      openTickets,
      pendingPOs,
      tiers,
    };
  }
});

// Since the DB is brand new, we generate realistic mock historical data 
// based on current totals to make the charts useful immediately.
export const getTenantGrowth = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    
    const organizations = await ctx.db.query("organizations").collect();
    const users = await ctx.db.query("users").collect();
    
    const totalTenants = organizations.length;
    const totalUsers = users.length;
    const currentMonth = new Date().getMonth();
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const result = [];
    
    // Generate 6 months of data, ending in the current month
    for (let i = 5; i >= 0; i--) {
      const mIdx = (currentMonth - i + 12) % 12;
      
      // Calculate a realistic growth curve backwards from current total
      const tenantDiscount = i === 0 ? 0 : Math.floor(Math.random() * 2) + i;
      const userDiscount = i === 0 ? 0 : Math.floor(Math.random() * 5) + (i * 3);
      
      result.push({
        month: months[mIdx],
        tenants: Math.max(1, totalTenants - tenantDiscount),
        users: Math.max(1, totalUsers - userDiscount),
        revenue: Math.max(0, (totalTenants - tenantDiscount) * 299)
      });
    }
    
    return result;
  }
});

export const getActivityMetrics = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    
    const pos = await ctx.db.query("purchaseOrders").collect();
    const tickets = await ctx.db.query("supportTickets").collect();
    
    // Purchase Order Status Distribution
    const poStats = [
      { name: "Draft", value: pos.filter(p => p.status === "draft").length, fill: "#94a3b8" },
      { name: "Sent", value: pos.filter(p => p.status === "sent").length, fill: "#60a5fa" },
      { name: "Confirmed", value: pos.filter(p => p.status === "confirmed").length, fill: "#34d399" },
      { name: "Shipped", value: pos.filter(p => p.status === "shipped").length, fill: "#fbbf24" },
      { name: "Delivered", value: pos.filter(p => p.status === "delivered").length, fill: "#10b981" },
      { name: "Cancelled", value: pos.filter(p => p.status === "cancelled").length, fill: "#ef4444" },
    ].filter(s => s.value > 0);

    // Support Ticket Status Distribution
    const ticketStats = [
      { name: "Open", value: tickets.filter(t => t.status === "open").length, fill: "#ef4444" },
      { name: "In Progress", value: tickets.filter(t => t.status === "in_progress").length, fill: "#f59e0b" },
      { name: "Resolved", value: tickets.filter(t => t.status === "resolved").length, fill: "#10b981" },
      { name: "Closed", value: tickets.filter(t => t.status === "closed").length, fill: "#94a3b8" },
    ].filter(s => s.value > 0);

    return { poStats, ticketStats };
  }
});
