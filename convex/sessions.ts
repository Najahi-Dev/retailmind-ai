// convex/sessions.ts
// Session self-service (list / revoke own sessions) + internal token resolution.
import { query, mutation, internalQuery } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getCallerUser, requireRole } from "./lib/roleGuard";
import { revokeAllUserSessions } from "./authInternal";

/** Internal: resolve an access token to {userId, sessionId} (used by actions). */
export const resolveAccessToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await getCallerUser(ctx, args.token);
    if (!user) return null;
    return {
      userId: user._id,
      sessionId: user._session._id,
      orgId: user.orgId,
      role: user.role,
      email: user.email,
      name: user.name,
      impersonatedBy: user._session.impersonatedBy,
    };
  },
});

/** Lists the caller's active sessions (devices). */
export const getMySessions = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.token);
    const now = Date.now();
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return sessions
      .filter((s) => !s.revokedAt && s.expiresAt > now && !s.impersonatedBy)
      .map((s) => ({
        _id: s._id,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt ?? s.createdAt,
        expiresAt: s.expiresAt,
        ip: s.ip,
        userAgent: s.userAgent,
        isCurrent: s._id === user._session._id,
      }));
  },
});

export const revokeMySession = mutation({
  args: { token: v.optional(v.string()), sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.token);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) throw new ConvexError("Session not found");
    await ctx.db.patch(session._id, { revokedAt: Date.now(), revokedReason: "user_revoked" });
    return { success: true };
  },
});

export const revokeOtherSessions = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.token);
    await revokeAllUserSessions(ctx, user._id, "user_revoked_others", user._session._id);
    return { success: true };
  },
});
