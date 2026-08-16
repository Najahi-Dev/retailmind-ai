// convex/wipeDb.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const ALL_TABLES = [
  "poPayments",
  "stockMovements",
  "inventory",
  "reorderSuggestions",
  "priceSuggestions",
  "forecasts",
  "alerts",
  "purchaseOrders",
  "products",
  "categories",
  "suppliers",
  "locations",
  "supportTickets",
  "securityLogs",
  "userPreferences",
  "subscriptions",
  "sessions",
  "users",
  "organizations",
] as const;

// ── 1. Check Record Counts Across All Tables ──
export const getDatabaseRecordCounts = query({
  args: {},
  handler: async (ctx) => {
    const counts: Record<string, number> = {};
    let total = 0;

    for (const table of ALL_TABLES) {
      const records = await ctx.db.query(table as any).take(5000);
      counts[table] = records.length;
      total += records.length;
    }

    return { total, counts };
  },
});

// ── 2. Wipe A Single Batch Chunk (Safe within execution limits) ──
export const wipeBatchChunk = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxDocs = args.batchSize ?? 250;
    let deletedInThisStep = 0;
    let activeTable = "";

    for (const table of ALL_TABLES) {
      const docs = await ctx.db.query(table as any).take(maxDocs - deletedInThisStep);
      if (docs.length > 0) {
        activeTable = table;
        for (const doc of docs) {
          await ctx.db.delete(doc._id);
          deletedInThisStep++;
        }
      }
      if (deletedInThisStep >= maxDocs) {
        break;
      }
    }

    return {
      deletedCount: deletedInThisStep,
      activeTable,
      isDone: deletedInThisStep === 0,
    };
  },
});
