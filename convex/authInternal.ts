// convex/authInternal.ts
// INTERNAL ONLY. These functions are reachable solely through `internal.authInternal.*`
// from other Convex functions (primarily the auth actions in ./auth.ts).
import { internalMutation, internalQuery } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  RATE_LIMITS,
  MAX_FAILED_LOGINS,
  LOCKOUT_MS,
  consumeRateLimit,
  resetRateLimit,
  ipKey,
} from "./lib/rateLimit";
import { REFRESH_TOKEN_TTL_MS, IMPERSONATION_TTL_MS } from "./lib/jwt";

/** Grace window where a just-rotated refresh token is treated as a benign race (multi-tab). */
export const REFRESH_REUSE_GRACE_MS = 30 * 1000;

function isOrgSuspended(org: any) {
  return org.isActive === false || (org.subscriptionStatus || "").toUpperCase() === "CANCELED";
}

// ── Login support ────────────────────────────────────────────────────────────

/**
 * Applies login rate limits (per IP + per email) and returns the data needed to
 * verify the password. Never reveals whether the account exists to the caller.
 */
export const beginLogin = internalMutation({
  args: { email: v.string(), ip: v.string() },
  handler: async (ctx, args) => {
    await consumeRateLimit(ctx, `login:ip:${ipKey(args.ip)}`, RATE_LIMITS.loginPerIp);
    await consumeRateLimit(ctx, `login:email:${args.email}`, RATE_LIMITS.loginPerEmail);

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) return null;

    return {
      userId: user._id,
      passwordHash: user.passwordHash ?? null,
      lockedUntil: user.lockedUntil ?? 0,
    };
  },
});

export const recordFailedLogin = internalMutation({
  args: { userId: v.id("users"), ip: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;
    const count = (user.failedLoginCount ?? 0) + 1;
    const patch: Record<string, number> = { failedLoginCount: count };
    if (count >= MAX_FAILED_LOGINS) {
      patch.lockedUntil = Date.now() + LOCKOUT_MS;
      patch.failedLoginCount = 0;
      await ctx.db.insert("securityLogs", {
        orgId: user.orgId,
        userId: user._id,
        email: user.email,
        role: user.role,
        eventType: "ACCOUNT_LOCKED",
        details: `Account locked for ${LOCKOUT_MS / 60000} minutes after ${MAX_FAILED_LOGINS} failed logins (ip ${ipKey(args.ip)})`,
        createdAt: Date.now(),
      });
    }
    await ctx.db.patch(args.userId, patch);
  },
});

/**
 * Validates account state after a correct password and creates the session.
 * Throws a user-facing ConvexError when the account may not sign in.
 */
export const completeLogin = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    refreshTokenHash: v.string(),
    ip: v.string(),
    userAgent: v.optional(v.string()),
    /** Optional workspace slug chosen on the "find your workspace" step. */
    workspace: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("Invalid email or password");

    // Workspace-scoped sign-in: the (already password-verified) account must belong to it.
    if (args.workspace && user.role !== "super_admin") {
      const org = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", args.workspace!))
        .first();
      if (!org || user.orgId !== org._id) {
        throw new ConvexError(
          `This account is not a member of the "${org?.name ?? args.workspace}" workspace. Check the workspace or sign in without selecting one.`,
        );
      }
    }

    if (user.role === "pending") {
      throw new ConvexError("Your user role is not assigned. Waiting for the admin approval.");
    }
    if (!user.isActive) {
      throw new ConvexError(
        "Account suspended: Your user account has been deactivated. Contact your administrator.",
      );
    }
    if (user.orgId && user.role !== "super_admin") {
      const org = await ctx.db.get(user.orgId);
      if (!org || isOrgSuspended(org)) {
        throw new ConvexError(
          "Workspace suspended: Your organization account has been suspended or canceled by an administrator. Please contact support.",
        );
      }
    }

    const now = Date.now();
    const sessionId = await ctx.db.insert("sessions", {
      userId: user._id,
      orgId: user.orgId,
      refreshTokenHash: args.refreshTokenHash,
      expiresAt: now + REFRESH_TOKEN_TTL_MS,
      createdAt: now,
      lastUsedAt: now,
      ip: ipKey(args.ip),
      userAgent: args.userAgent?.slice(0, 256),
    });
    await ctx.db.patch(user._id, { lastLogin: now, failedLoginCount: 0, lockedUntil: undefined });
    await resetRateLimit(ctx, `login:email:${args.email}`);

    return {
      sessionId,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId,
        imageUrl: user.imageUrl,
      },
      refreshExpiresAt: now + REFRESH_TOKEN_TTL_MS,
    };
  },
});

// ── Refresh token rotation ───────────────────────────────────────────────────

/**
 * Atomically rotates a refresh token.
 *  - current token  → rotate, return session + user (caller issues new token pair)
 *  - previous token within grace window → "grace": issue access token only (multi-tab race)
 *  - previous token outside grace window → REUSE DETECTED: revoke the session
 *  - unknown / expired / revoked → null
 */
export const rotateRefreshToken = internalMutation({
  args: {
    refreshTokenHash: v.string(),
    newRefreshTokenHash: v.string(),
    ip: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await consumeRateLimit(ctx, `refresh:ip:${ipKey(args.ip)}`, RATE_LIMITS.refreshPerIp);
    const now = Date.now();

    let session = await ctx.db
      .query("sessions")
      .withIndex("by_refresh_hash", (q) => q.eq("refreshTokenHash", args.refreshTokenHash))
      .unique();
    let mode: "rotated" | "grace" = "rotated";

    if (!session) {
      const prev = await ctx.db
        .query("sessions")
        .withIndex("by_prev_refresh_hash", (q) => q.eq("prevRefreshTokenHash", args.refreshTokenHash))
        .unique();
      if (!prev || prev.revokedAt) return null;
      if (prev.rotatedAt && now - prev.rotatedAt <= REFRESH_REUSE_GRACE_MS) {
        session = prev;
        mode = "grace";
      } else {
        // A rotated-out refresh token was replayed: assume theft and kill the session.
        await ctx.db.patch(prev._id, { revokedAt: now, revokedReason: "refresh_token_reuse" });
        const u = await ctx.db.get(prev.userId);
        await ctx.db.insert("securityLogs", {
          orgId: prev.orgId,
          userId: prev.userId,
          email: u?.email,
          role: u?.role,
          eventType: "REFRESH_TOKEN_REUSE",
          details: `Rotated refresh token replayed from ip ${ipKey(args.ip)}; session revoked.`,
          targetId: prev._id,
          createdAt: now,
        });
        return null;
      }
    }

    if (session.revokedAt || session.expiresAt < now || session.impersonatedBy) return null;

    const user = await ctx.db.get(session.userId);
    if (!user || !user.isActive || user.role === "pending") return null;
    if (user.orgId && user.role !== "super_admin") {
      const org = await ctx.db.get(user.orgId);
      if (!org || isOrgSuspended(org)) return null;
    }

    if (mode === "rotated") {
      await ctx.db.patch(session._id, {
        prevRefreshTokenHash: args.refreshTokenHash,
        refreshTokenHash: args.newRefreshTokenHash,
        rotatedAt: now,
        lastUsedAt: now,
        ip: ipKey(args.ip),
        userAgent: args.userAgent?.slice(0, 256),
        orgId: user.orgId,
      });
    }

    return {
      mode,
      sessionId: session._id,
      refreshExpiresAt: session.expiresAt,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId,
        imageUrl: user.imageUrl,
      },
    };
  },
});

export const revokeSessionByRefreshHash = internalMutation({
  args: { refreshTokenHash: v.string(), reason: v.string() },
  handler: async (ctx, args) => {
    const session =
      (await ctx.db
        .query("sessions")
        .withIndex("by_refresh_hash", (q) => q.eq("refreshTokenHash", args.refreshTokenHash))
        .unique()) ??
      (await ctx.db
        .query("sessions")
        .withIndex("by_prev_refresh_hash", (q) => q.eq("prevRefreshTokenHash", args.refreshTokenHash))
        .unique());
    if (session && !session.revokedAt) {
      await ctx.db.patch(session._id, { revokedAt: Date.now(), revokedReason: args.reason });
    }
  },
});

export const revokeSessionById = internalMutation({
  args: { sessionId: v.id("sessions"), reason: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (session && !session.revokedAt) {
      await ctx.db.patch(session._id, { revokedAt: Date.now(), revokedReason: args.reason });
    }
  },
});

/** Revokes every session of a user (password change, deactivation, admin action). */
export async function revokeAllUserSessions(
  ctx: { db: any },
  userId: Id<"users">,
  reason: string,
  exceptSessionId?: Id<"sessions">,
) {
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
  const now = Date.now();
  for (const s of sessions) {
    if (s._id !== exceptSessionId && !s.revokedAt) {
      await ctx.db.patch(s._id, { revokedAt: now, revokedReason: reason });
    }
  }
}

export const revokeAllSessionsForUser = internalMutation({
  args: { userId: v.id("users"), reason: v.string() },
  handler: async (ctx, args) => {
    await revokeAllUserSessions(ctx, args.userId, args.reason);
  },
});

/** Creates a short-lived, non-refreshable impersonation session. */
export async function createImpersonationSession(
  ctx: { db: any },
  targetUser: { _id: Id<"users">; orgId?: Id<"organizations"> },
  superAdminId: Id<"users">,
) {
  const now = Date.now();
  return (await ctx.db.insert("sessions", {
    userId: targetUser._id,
    orgId: targetUser.orgId,
    impersonatedBy: superAdminId,
    expiresAt: now + IMPERSONATION_TTL_MS,
    createdAt: now,
    lastUsedAt: now,
  })) as Id<"sessions">;
}

// ── Registration ─────────────────────────────────────────────────────────────

export const checkRegisterRateLimit = internalMutation({
  args: { ip: v.string() },
  handler: async (ctx, args) => {
    await consumeRateLimit(ctx, `register:ip:${ipKey(args.ip)}`, RATE_LIMITS.registerPerIp);
  },
});

/** Self-registration: always creates a `pending` user with no org. */
export const createPendingUser = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) throw new ConvexError("User with this email already exists");
    return await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      phone: args.phone,
      passwordHash: args.passwordHash,
      role: "pending",
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

/**
 * Creates a user inside a specific org (used by admin flows such as
 * superAdminActions.addTenantUser). Never falls back to another org.
 */
export const createUserRecord = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("staff"),
      v.literal("supplier"),
      v.literal("pending"),
    ),
    imageUrl: v.optional(v.string()),
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) throw new ConvexError("User with this email already exists");

    const userId = await ctx.db.insert("users", {
      orgId: args.orgId,
      email,
      name: args.name,
      phone: args.phone,
      passwordHash: args.passwordHash,
      role: args.role,
      imageUrl: args.imageUrl,
      isActive: true,
      createdAt: Date.now(),
    });

    if (args.role === "supplier") {
      const orgSuppliers = await ctx.db
        .query("suppliers")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .collect();
      const existingSupplier = orgSuppliers.find(
        (s) => s.email && s.email.toLowerCase().trim() === email,
      );
      if (existingSupplier) {
        await ctx.db.patch(userId, { supplierId: existingSupplier._id });
      } else {
        const supplierId = await ctx.db.insert("suppliers", {
          orgId: args.orgId,
          name: args.name,
          email,
          phone: args.phone,
          leadTimeDays: 3,
          status: "active",
          isActive: true,
          createdAt: Date.now(),
        });
        await ctx.db.patch(userId, { supplierId });
      }
    }
    return userId;
  },
});

export const updateUserStatus = internalMutation({
  args: { userId: v.id("users"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { isActive: args.isActive });
    if (!args.isActive) await revokeAllUserSessions(ctx, args.userId, "user_deactivated");
  },
});

export const getUserForPasswordChange = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user ? { _id: user._id, passwordHash: user.passwordHash ?? null } : null;
  },
});

/** Sets a new password hash and revokes every other session of the user. */
export const setPasswordHash = internalMutation({
  args: {
    userId: v.id("users"),
    passwordHash: v.string(),
    keepSessionId: v.optional(v.id("sessions")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      passwordHash: args.passwordHash,
      passwordChangedAt: Date.now(),
    });
    await revokeAllUserSessions(ctx, args.userId, "password_changed", args.keepSessionId);
  },
});

export const createWorkspaceAndOwnerRecord = internalMutation({
  args: {
    companyName: v.string(),
    slug: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    passwordHash: v.string(),
    inviteCode: v.string(),
    refreshTokenHash: v.string(),
    ip: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanEmail = args.email.toLowerCase().trim();
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", cleanEmail))
      .first();
    if (existingUser) {
      throw new ConvexError(
        "An account with this email address already exists. Please sign in instead.",
      );
    }
    const slugTaken = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .first();
    if (slugTaken) throw new ConvexError("That workspace URL is already taken. Choose another.");

    const now = Date.now();
    const orgId = await ctx.db.insert("organizations", {
      name: args.companyName,
      slug: args.slug,
      inviteCode: args.inviteCode,
      plan: "starter",
      isActive: true,
      isTrialUsed: false,
      createdAt: now,
    });

    const userId = await ctx.db.insert("users", {
      orgId,
      email: cleanEmail,
      name: args.name,
      phone: args.phone,
      passwordHash: args.passwordHash,
      role: "admin",
      isActive: true,
      createdAt: now,
      lastLogin: now,
    });
    await ctx.db.patch(orgId, { ownerId: userId });

    const sessionId = await ctx.db.insert("sessions", {
      userId,
      orgId,
      refreshTokenHash: args.refreshTokenHash,
      expiresAt: now + REFRESH_TOKEN_TTL_MS,
      createdAt: now,
      lastUsedAt: now,
      ip: ipKey(args.ip),
      userAgent: args.userAgent?.slice(0, 256),
    });

    return { userId, orgId, sessionId, refreshExpiresAt: now + REFRESH_TOKEN_TTL_MS };
  },
});

// ── Password reset ───────────────────────────────────────────────────────────

export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

/**
 * Rate-limits the request and, if the account exists and may sign in, stores a
 * hashed single-use token and schedules the e-mail. Returns nothing either way
 * so callers cannot learn whether an account exists.
 */
export const createPasswordReset = internalMutation({
  args: {
    email: v.string(),
    ip: v.string(),
    tokenHash: v.string(),
    token: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await consumeRateLimit(ctx, `pwreset:ip:${ipKey(args.ip)}`, RATE_LIMITS.passwordResetPerIp);
    await consumeRateLimit(ctx, `pwreset:email:${args.email}`, RATE_LIMITS.passwordResetPerEmail);

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user || !user.isActive || user.role === "pending") return null;

    // Only the newest link is valid.
    const now = Date.now();
    const previous = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const p of previous) {
      if (!p.usedAt) await ctx.db.patch(p._id, { usedAt: now });
    }

    await ctx.db.insert("passwordResetTokens", {
      userId: user._id,
      tokenHash: args.tokenHash,
      expiresAt: now + PASSWORD_RESET_TTL_MS,
      createdAt: now,
      ip: ipKey(args.ip),
    });
    await ctx.db.insert("securityLogs", {
      orgId: user.orgId,
      userId: user._id,
      email: user.email,
      role: user.role,
      eventType: "PASSWORD_RESET_REQUESTED",
      details: `Password reset link requested from ip ${ipKey(args.ip)}`,
      createdAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.mailer.sendPasswordResetEmail, {
      toEmail: user.email,
      toName: user.name,
      token: args.token,
      requestedAt: now,
      ip: ipKey(args.ip),
      userAgent: args.userAgent?.slice(0, 256),
    });
    return null;
  },
});

/** Validates a reset token (read-only) so the reset page can show "expired" early. */
export const checkPasswordResetToken = internalMutation({
  args: { tokenHash: v.string(), ip: v.string() },
  handler: async (ctx, args) => {
    await consumeRateLimit(ctx, `pwreset-check:ip:${ipKey(args.ip)}`, RATE_LIMITS.refreshPerIp);
    const row = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();
    return !!row && !row.usedAt && row.expiresAt > Date.now();
  },
});

/**
 * Atomically consumes a reset token and sets the new password. Clears lockout,
 * revokes every session and writes a security log entry.
 */
export const consumePasswordReset = internalMutation({
  args: { tokenHash: v.string(), passwordHash: v.string(), ip: v.string() },
  handler: async (ctx, args) => {
    await consumeRateLimit(ctx, `pwreset-confirm:ip:${ipKey(args.ip)}`, RATE_LIMITS.passwordResetPerIp);
    const now = Date.now();
    const row = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", args.tokenHash))
      .unique();
    if (!row || row.usedAt || row.expiresAt < now) {
      throw new ConvexError("This reset link is invalid or has expired. Please request a new one.");
    }
    const user = await ctx.db.get(row.userId);
    if (!user || !user.isActive || user.role === "pending") {
      throw new ConvexError("This reset link is invalid or has expired. Please request a new one.");
    }

    await ctx.db.patch(row._id, { usedAt: now });
    await ctx.db.patch(user._id, {
      passwordHash: args.passwordHash,
      passwordChangedAt: now,
      failedLoginCount: 0,
      lockedUntil: undefined,
    });
    await revokeAllUserSessions(ctx, user._id, "password_reset");
    await ctx.db.insert("securityLogs", {
      orgId: user.orgId,
      userId: user._id,
      email: user.email,
      role: user.role,
      eventType: "PASSWORD_RESET_COMPLETED",
      details: `Password reset completed from ip ${ipKey(args.ip)}; all sessions revoked.`,
      createdAt: now,
    });
    return { success: true };
  },
});

// ── Maintenance ──────────────────────────────────────────────────────────────

/** Deletes expired/revoked sessions and stale rate-limit buckets (run by cron). */
export const purgeExpiredAuthData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sessions = await ctx.db.query("sessions").take(500);
    let deleted = 0;
    for (const s of sessions) {
      if (s.expiresAt < now || (s.revokedAt && now - s.revokedAt > 24 * 60 * 60 * 1000) || (!s.refreshTokenHash && !s.impersonatedBy)) {
        await ctx.db.delete(s._id);
        deleted++;
      }
    }
    const resets = await ctx.db.query("passwordResetTokens").take(500);
    for (const r of resets) {
      if (r.expiresAt < now - 24 * 60 * 60 * 1000) await ctx.db.delete(r._id);
    }
    const buckets = await ctx.db.query("rateLimits").take(500);
    for (const b of buckets) {
      if (now - b.updatedAt > 24 * 60 * 60 * 1000) await ctx.db.delete(b._id);
    }
    return { deletedSessions: deleted };
  },
});

/**
 * One-time bootstrap: promote an existing account to super_admin.
 * Run from the CLI only:  npx convex run authInternal:bootstrapSuperAdmin '{"email":"you@x.com"}'
 */
export const bootstrapSuperAdmin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase().trim()))
      .first();
    if (!user) throw new ConvexError("User not found");
    await ctx.db.patch(user._id, { role: "super_admin", isActive: true });
    return user._id;
  },
});
