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
