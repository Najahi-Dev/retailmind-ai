import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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

// ── PURCHASE ORDERS ──
export const getPlatformPurchaseOrders = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    const pos = await ctx.db.query("purchaseOrders").order("desc").take(100);
    
    return await Promise.all(
      pos.map(async (po) => {
        let orgName = "Unknown Tenant";
        if (po.orgId) {
          const org = await ctx.db.get(po.orgId);
          if (org) {
            orgName = org.name;
          }
        }
        let supplierName = "Unknown Supplier";
        if (po.supplierId) {
          const supplier = await ctx.db.get(po.supplierId);
          if (supplier) {
            supplierName = supplier.name;
          } else {
            supplierName = `Not Found (${po.supplierId})`;
          }
        }

        let lineItemsWithSkus = po.lineItems;
        if (po.lineItems && po.lineItems.length > 0) {
          lineItemsWithSkus = await Promise.all(
            po.lineItems.map(async (item: any) => {
              const product = await ctx.db.get(item.productId as Id<"products">);
              return { ...item, sku: product?.sku || "Unknown SKU" };
            })
          );
        }
        
        return { ...po, orgName, supplierName, lineItems: lineItemsWithSkus };
      })
    );
  }
});

// ── APPROVALS ──

// Lightweight count query for the sidebar badge
export const getPendingApprovalsCount = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    const pending = await ctx.db
      .query("approvals")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
    return pending.length;
  },
});

export const getPlatformApprovals = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    const approvals = await ctx.db.query("approvals").order("desc").take(100);

    // Enrich with org name and requester name
    return await Promise.all(
      approvals.map(async (a) => {
        let orgName = "Unknown Tenant";
        if (a.orgId) {
          const org = await ctx.db.get(a.orgId);
          if (org) orgName = (org as any).name ?? orgName;
        }
        let requesterName = "Unknown User";
        if (a.requesterId) {
          const user = await ctx.db.get(a.requesterId);
          if (user) requesterName = (user as any).name ?? requesterName;
        }
        return { ...a, orgName, requesterName };
      })
    );
  }
});

export const updateApprovalStatus = mutation({
  args: {
    token: v.optional(v.string()),
    approvalId: v.id("approvals"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    
    await ctx.db.patch(args.approvalId, {
      status:     args.status,
      reviewedBy: admin._id,
      updatedAt:  Date.now(),
    });

    // ── EXECUTE: If approved, run the originally blocked action ────────
    if (args.status === "approved") {
      await ctx.runMutation(internal.guardrails.executeApprovedAction, {
        approvalId: args.approvalId,
        reviewerId: admin._id,
      });
    }
    // ─────────────────────────────────────────────────────────

    await ctx.db.insert("adminAuditLogs", {
      adminId:   admin._id,
      action:    "REVIEW_APPROVAL",
      details:   `Marked approval ${args.approvalId} as ${args.status}`,
      timestamp: Date.now(),
    });

    return { success: true };
  }
});

// ── INTEGRATIONS ──
export const getPlatformIntegrations = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    return await ctx.db.query("integrations").order("desc").take(100);
  }
});

export const toggleIntegrationStatus = mutation({
  args: {
    token: v.optional(v.string()),
    integrationId: v.id("integrations"),
    status: v.union(v.literal("active"), v.literal("disconnected")),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    
    await ctx.db.patch(args.integrationId, {
      status: args.status,
    });

    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "TOGGLE_INTEGRATION",
      details: `Marked integration ${args.integrationId} as ${args.status}`,
      timestamp: Date.now(),
    });

    return { success: true };
  }
});

// ── WEBHOOKS ──
export const getWebhooks = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    return await ctx.db.query("platformWebhooks").order("desc").collect();
  }
});

export const createWebhook = mutation({
  args: {
    token: v.optional(v.string()),
    url: v.string(),
    secret: v.string(),
    events: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    const id = await ctx.db.insert("platformWebhooks", {
      url: args.url,
      secret: args.secret,
      events: args.events,
      isActive: true,
      createdAt: Date.now(),
    });
    
    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "CREATE_WEBHOOK",
      details: `Created global webhook for ${args.url}`,
      timestamp: Date.now(),
    });
    
    return id;
  }
});

export const toggleWebhook = mutation({
  args: {
    token: v.optional(v.string()),
    webhookId: v.id("platformWebhooks"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    await ctx.db.patch(args.webhookId, { isActive: args.isActive });
    
    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "TOGGLE_WEBHOOK",
      details: `Marked webhook ${args.webhookId} active state to ${args.isActive}`,
      timestamp: Date.now(),
    });
  }
});

export const deleteWebhook = mutation({
  args: {
    token: v.optional(v.string()),
    webhookId: v.id("platformWebhooks"),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    await ctx.db.delete(args.webhookId);
    
    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "DELETE_WEBHOOK",
      details: `Deleted webhook ${args.webhookId}`,
      timestamp: Date.now(),
    });
  }
});

// ── API KEYS ──
export const getApiKeys = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.token);
    return await ctx.db.query("platformApiKeys").order("desc").collect();
  }
});

export const createApiKey = mutation({
  args: {
    token: v.optional(v.string()),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    
    // In a real app we'd use a crypto library, but we just simulate it here for the UI.
    const rawKey = `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const keyMasked = `sk_live_****${rawKey.slice(-4)}`;
    const keyHash = `hash_${rawKey}`;
    
    const id = await ctx.db.insert("platformApiKeys", {
      name: args.name,
      keyMasked,
      keyHash,
      isActive: true,
      createdAt: Date.now(),
    });
    
    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "CREATE_API_KEY",
      details: `Generated new global API key: ${args.name}`,
      timestamp: Date.now(),
    });
    
    return { id, rawKey };
  }
});

export const revokeApiKey = mutation({
  args: {
    token: v.optional(v.string()),
    keyId: v.id("platformApiKeys"),
  },
  handler: async (ctx, args) => {
    const admin = await requireSuperAdmin(ctx, args.token);
    await ctx.db.patch(args.keyId, { isActive: false });
    
    await ctx.db.insert("adminAuditLogs", {
      adminId: admin._id,
      action: "REVOKE_API_KEY",
      details: `Revoked global API key ${args.keyId}`,
      timestamp: Date.now(),
    });
  }
});
