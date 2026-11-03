// convex/audit.ts
import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, isSuperAdminUser } from "./lib/roleGuard";

// Log a security event (IDOR attempt, unauthorized mutation, etc.).
// Internal only: identity fields must come from trusted server code, never from a client.
export const logSecurityEvent = internalMutation({
  args: {
    orgId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    email: v.optional(v.string()),
    role: v.optional(v.string()),
    eventType: v.string(), // "SECURITY_WARNING" | "IDOR_ATTEMPT" | "UNAUTHORIZED_MUTATION"
    details: v.string(),
    targetId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("securityLogs", {
      orgId: args.orgId,
      userId: args.userId,
      email: args.email,
      role: args.role,
      eventType: args.eventType,
      details: args.details.slice(0, 2000),
      targetId: args.targetId,
      createdAt: Date.now(),
    });
    return logId;
  },
});

// Query security audit logs.
// Super admins see platform-wide logs; organization admins see only their own org's logs.
export const getSecurityLogs = query({
  args: {
    token: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const caller = await requireRole(ctx, args.token, ["super_admin", "admin"]);
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 50), 1), 200);

    if (isSuperAdminUser(caller) && !caller._session.impersonatedBy) {
      return await ctx.db.query("securityLogs").order("desc").take(limit);
    }

    if (caller.role !== "admin" || !caller.orgId) {
      // Impersonated super admin or misconfigured admin: no platform-wide access.
      return [];
    }
    const orgId = caller.orgId;
    return await ctx.db
      .query("securityLogs")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(limit);
  },
});
