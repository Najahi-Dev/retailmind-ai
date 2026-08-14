// convex/audit.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Log a security event (IDOR attempt, unauthorized mutation, etc.)
export const logSecurityEvent = mutation({
  args: {
    userId: v.optional(v.id("users")),
    email: v.optional(v.string()),
    role: v.optional(v.string()),
    eventType: v.string(), // "SECURITY_WARNING" | "IDOR_ATTEMPT" | "UNAUTHORIZED_MUTATION"
    details: v.string(),
    targetId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("securityLogs", {
      userId: args.userId,
      email: args.email,
      role: args.role,
      eventType: args.eventType,
      details: args.details,
      targetId: args.targetId,
      createdAt: Date.now(),
    });
    return logId;
  },
});

// Query security audit logs for administrators
export const getSecurityLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const logs = await ctx.db
      .query("securityLogs")
      .order("desc")
      .take(limit);

    return logs;
  },
});
