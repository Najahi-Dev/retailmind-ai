import { internalMutation } from "../_generated/server";
import { ConvexError, v } from "convex/values";

/**
 * Multi-Tenant Data Migration & Backfill Script
 * Automatically provisions a default organization ("RetailMind Main Supermarket Network")
 * and attaches orgId to all pre-existing single-tenant records in safe batches.
 *
 * INTERNAL ONLY. Run from the CLI, supplying a freshly generated random invite code
 * (only used if the default organization has to be created), e.g.:
 *   npx convex run migrations/multiTenantMigration:migrateToMultiTenant  *     '{"inviteCode":"<output of: openssl rand -hex 12>"}'
 */
export const migrateToMultiTenant = internalMutation({
  args: {
    inviteCode: v.string(),
    targetTable: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const inviteCode = args.inviteCode.trim().toUpperCase();
    if (inviteCode.length < 16 || inviteCode === "RETAILMIND-MAIN-2026") {
      throw new ConvexError("inviteCode must be a freshly generated random string (>= 16 chars).");
    }
    // 1. Ensure default organization exists
    let defaultOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", "retailmind-main"))
      .first();

    if (!defaultOrg) {
      const orgId = await ctx.db.insert("organizations", {
        name: "RetailMind Main Supermarket Network",
        slug: "retailmind-main",
        inviteCode,
        plan: "enterprise",
        isActive: true,
        isTrialUsed: true,
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
