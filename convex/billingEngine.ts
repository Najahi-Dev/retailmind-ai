import { mutation, query, internalMutation, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireSuperAdmin } from "./lib/roleGuard";
import { requireServerSecret } from "./lib/serverSecret";

// ── Webhook Dead-Letter Queue (DLQ) ──

// Called ONLY by the Next.js Stripe webhook route (requires AUTH_SERVER_SECRET).
export const logStripeWebhookFailure = mutation({
  args: {
    serverSecret: v.string(),
    eventId: v.string(),
    eventType: v.string(),
    payload: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    await ctx.db.insert("stripeWebhookFailures", {
      eventId: args.eventId,
      eventType: args.eventType,
      payload: args.payload.slice(0, 200_000),
      error: args.error.slice(0, 5_000),
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
});


export const getWebhookFailures = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    return await ctx.db.query("stripeWebhookFailures")
      .withIndex("by_status", (q: any) => q.eq("status", "pending"))
      .order("desc")
      .collect();
  }
});

export const resolveWebhookFailure = mutation({
  args: {
    token: v.optional(v.string()),
    id: v.id("stripeWebhookFailures"),
    status: v.union(v.literal("retried"), v.literal("resolved")),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  }
});

// ── Offline Payments / Manual Invoicing ──

export const processOfflinePayment = mutation({
  args: {
    token: v.optional(v.string()),
    orgId: v.id("organizations"),
    planTier: v.union(v.literal("STARTER"), v.literal("GROWTH"), v.literal("ENTERPRISE")),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    const org = await ctx.db.get(args.orgId);
    if (!org) throw new Error("Organization not found");

    await ctx.db.patch(args.orgId, {
      paymentMethod: "offline",
      planTier: args.planTier,
      subscriptionStatus: "ACTIVE",
      currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000, // +30 days
      isActive: true,
    });

    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "OFFLINE_PAYMENT",
      targetOrgId: args.orgId,
      details: `Processed manual offline payment for tier ${args.planTier}`,
      timestamp: Date.now(),
    });

    return { success: true };
  }
});

// ── Dunning Engine (Cron) ──

export const runDunningEngine = internalMutation({
  args: {},
  handler: async (ctx) => {
    const pastDueOrgs = await ctx.db.query("organizations")
      .filter(q => q.eq(q.field("subscriptionStatus"), "PAST_DUE"))
      .collect();

    for (const org of pastDueOrgs) {
      // Logic for sending warning emails
      // Here we would ideally check dunningLogs to see what was sent last
      // and determine if we should send warning 1, 3, 7 or suspend.
      
      const logs = await ctx.db.query("dunningLogs")
        .withIndex("by_org", q => q.eq("orgId", org._id))
        .collect();
        
      if (logs.length === 0) {
        // Send Warning 1
        await ctx.db.insert("dunningLogs", { orgId: org._id, status: "warning_1", sentAt: Date.now() });
      } else if (logs.length === 1) {
        // Send Warning 3
        await ctx.db.insert("dunningLogs", { orgId: org._id, status: "warning_3", sentAt: Date.now() });
      } else if (logs.length === 2) {
        // Send Warning 7
        await ctx.db.insert("dunningLogs", { orgId: org._id, status: "warning_7", sentAt: Date.now() });
      } else {
        // Suspend
        await ctx.db.patch(org._id, {
          subscriptionStatus: "CANCELED",
          isActive: false,
        });
        await ctx.db.insert("dunningLogs", { orgId: org._id, status: "suspended", sentAt: Date.now() });
      }
    }
  }
});
