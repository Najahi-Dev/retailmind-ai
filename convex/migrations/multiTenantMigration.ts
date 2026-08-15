import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Multi-Tenant Data Migration & Backfill Script
 * Automatically provisions a default organization ("RetailMind Main Supermarket Network")
 * and attaches orgId to all pre-existing single-tenant records in safe batches.
 */
export const migrateToMultiTenant = mutation({
  args: {
    targetTable: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Ensure default organization exists
    let defaultOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "retailmind-main"))
      .first();

    if (!defaultOrg) {
      const orgId = await ctx.db.insert("organizations", {
        name: "RetailMind Main Supermarket Network",
        slug: "retailmind-main",
        inviteCode: "RETAILMIND-MAIN-2026",
        plan: "enterprise",
        isActive: true,
        createdAt: Date.now(),
      });
      defaultOrg = (await ctx.db.get(orgId))!;
    }

    const orgId = defaultOrg._id;
    let totalUpdated = 0;

    const backfillTableBatch = async (tableName: any) => {
      const records = await ctx.db.query(tableName).take(150);
      let count = 0;
      for (const rec of records) {
        if (!rec.orgId) {
          await ctx.db.patch(rec._id, { orgId });
          count++;
        }
      }
      return count;
    };

    const tablesToMigrate = args.targetTable
      ? [args.targetTable]
      : [
          "users",
          "sessions",
          "locations",
          "categories",
          "suppliers",
          "products",
          "inventory",
          "purchaseOrders",
          "reorderSuggestions",
          "alerts",
          "supportTickets",
        ];

    const results: Record<string, number> = {};
    for (const table of tablesToMigrate) {
      const count = await backfillTableBatch(table as any);
      results[table] = count;
      totalUpdated += count;
    }

    return {
      success: true,
      defaultOrgId: orgId,
      defaultOrgName: defaultOrg.name,
      totalUpdated,
      results,
    };
  },
});
