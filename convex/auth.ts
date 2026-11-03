"use node";
// convex/auth.ts
// Authentication actions. All of these are invoked ONLY by the Next.js server
// route handlers under app/api/auth/* (they require AUTH_SERVER_SECRET), which
// supply the real client IP for rate limiting and manage the HttpOnly
// refresh-token cookie.
//
// Token model:
//   accessToken  – HS256 JWT, 15 min, bound to a session row (revocable)
//   refreshToken – 256-bit random opaque token, stored hashed, rotated on every use
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { signAccessToken, randomToken, sha256Hex } from "./lib/jwt";
import { requireServerSecret } from "./lib/serverSecret";
import { validatePasswordStrength } from "./lib/password";

const BCRYPT_ROUNDS = 12;
// Hash of a random string: used to keep timing uniform for unknown accounts.
const DUMMY_HASH = "$2b$12$RhZyDHraqB0Uan8WAkB6C.tjC1NzNPSk4j5ypapq2ZEp86NBEe1G2";

const clientMeta = {
  serverSecret: v.string(),
  ip: v.string(),
  userAgent: v.optional(v.string()),
};

function normalizeEmail(email: string) {
  const e = email.toLowerCase().trim();
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    throw new ConvexError("Please enter a valid email address.");
  }
  return e;
}

type LoginRecord = { userId: Id<"users">; passwordHash: string | null; lockedUntil: number } | null;
type SessionResult = {
  sessionId: Id<"sessions">;
  refreshExpiresAt: number;
  user: SessionUser;
};
type TokenResponse = {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string | null;
  refreshTokenExpiresAt: number;
  user: SessionUser;
};

type SessionUser = {
  _id: string;
  email: string;
  name: string;
  role: string;
  orgId?: string;
  imageUrl?: string;
};

async function issueTokens(sessionId: string, user: SessionUser) {
  const access = await signAccessToken({
    userId: user._id,
    sessionId,
    role: user.role,
    orgId: user.orgId,
    email: user.email,
    name: user.name,
  });
  return { accessToken: access.token, accessTokenExpiresAt: access.expiresAt };
}

// ── LOGIN ────────────────────────────────────────────────────────────────────
export const loginUser = action({
  args: {
    email: v.string(),
    password: v.string(),
    workspace: v.optional(v.string()),
    ...clientMeta,
  },
  handler: async (ctx, args): Promise<TokenResponse> => {
    requireServerSecret(args.serverSecret);
    const email = args.email.toLowerCase().trim();
    if (!email || !args.password || args.password.length > 128) {
      throw new ConvexError("Invalid email or password");
    }

    // Rate limits (per IP + per email) are enforced inside beginLogin.
    const record: LoginRecord = await ctx.runMutation(internal.authInternal.beginLogin, { email, ip: args.ip });

    if (record && record.lockedUntil > Date.now()) {
      const retryAfterMs = record.lockedUntil - Date.now();
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: `Account temporarily locked after too many failed attempts. Try again in ${Math.ceil(retryAfterMs / 60000)} minute(s).`,
        retryAfterMs,
      });
    }

    // Always run bcrypt so response time does not reveal whether the account exists.
    const hash = record?.passwordHash || DUMMY_HASH;
    const valid = await bcrypt.compare(args.password, hash);

    if (!record || !record.passwordHash || !valid) {
      if (record) {
        await ctx.runMutation(internal.authInternal.recordFailedLogin, {
          userId: record.userId,
          ip: args.ip,
        });
      }
      throw new ConvexError("Invalid email or password");
    }

    const refreshToken = randomBytes(32).toString("base64url");
    const result: SessionResult = await ctx.runMutation(internal.authInternal.completeLogin, {
      userId: record.userId,
      email,
      refreshTokenHash: await sha256Hex(refreshToken),
      ip: args.ip,
      userAgent: args.userAgent,
      workspace: args.workspace?.toLowerCase().trim().slice(0, 48) || undefined,
    });

    const tokens = await issueTokens(result.sessionId, result.user);
    return {
      ...tokens,
      refreshToken,
      refreshTokenExpiresAt: result.refreshExpiresAt,
      user: result.user,
    };
  },
});

// ── REFRESH (rotating) ───────────────────────────────────────────────────────
export const refreshSession = action({
  args: { refreshToken: v.string(), ...clientMeta },
  handler: async (ctx, args): Promise<TokenResponse | null> => {
    requireServerSecret(args.serverSecret);
    if (!args.refreshToken || args.refreshToken.length > 256) return null;

    const newRefreshToken = randomBytes(32).toString("base64url");
    const result: (SessionResult & { mode: "rotated" | "grace" }) | null = await ctx.runMutation(internal.authInternal.rotateRefreshToken, {
      refreshTokenHash: await sha256Hex(args.refreshToken),
      newRefreshTokenHash: await sha256Hex(newRefreshToken),
      ip: args.ip,
      userAgent: args.userAgent,
    });
    if (!result) return null;

    const tokens = await issueTokens(result.sessionId, result.user);
    return {
      ...tokens,
      // In the multi-tab grace case the browser already holds the newest refresh token.
      refreshToken: result.mode === "rotated" ? newRefreshToken : null,
      refreshTokenExpiresAt: result.refreshExpiresAt,
      user: result.user,
    };
  },
});

// ── LOGOUT ───────────────────────────────────────────────────────────────────
export const logoutUser = action({
  args: { refreshToken: v.optional(v.string()), serverSecret: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    if (args.refreshToken) {
      await ctx.runMutation(internal.authInternal.revokeSessionByRefreshHash, {
        refreshTokenHash: await sha256Hex(args.refreshToken),
        reason: "logout",
      });
    }
    return { success: true };
  },
});

// ── SELF REGISTRATION (pending approval) ─────────────────────────────────────
export const registerUser = action({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    ...clientMeta,
  },
  handler: async (ctx, args): Promise<{ isPending: true; userId: Id<"users">; email: string; name: string; role: "pending"; message: string }> => {
    requireServerSecret(args.serverSecret);
    await ctx.runMutation(internal.authInternal.checkRegisterRateLimit, { ip: args.ip });
    const email = normalizeEmail(args.email);
    validatePasswordStrength(args.password);
    const name = args.name.trim().slice(0, 120);
    if (!name) throw new ConvexError("Name is required.");

    const userId: Id<"users"> = await ctx.runMutation(internal.authInternal.createPendingUser, {
      email,
      passwordHash: await bcrypt.hash(args.password, BCRYPT_ROUNDS),
      name,
      phone: args.phone?.trim().slice(0, 40) || undefined,
    });

    return {
      isPending: true,
      userId,
      email,
      name,
      role: "pending",
      message:
        "Account registered successfully! Your account is currently pending administrator role assignment and approval.",
    };
  },
});

// ── WORKSPACE + OWNER REGISTRATION ───────────────────────────────────────────
export const registerWorkspaceAndOwner = action({
  args: {
    companyName: v.string(),
    slug: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    password: v.string(),
    ...clientMeta,
  },
  handler: async (ctx, args): Promise<TokenResponse & { orgId: Id<"organizations">; inviteCode: string }> => {
    requireServerSecret(args.serverSecret);
    await ctx.runMutation(internal.authInternal.checkRegisterRateLimit, { ip: args.ip });

    const email = normalizeEmail(args.email);
    validatePasswordStrength(args.password);
    const companyName = args.companyName.trim().slice(0, 120);
    const name = args.name.trim().slice(0, 120);
    const slug = args.slug.toLowerCase().trim();
    if (!companyName || !name) throw new ConvexError("Company name and your name are required.");
    if (!/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])?$/.test(slug)) {
      throw new ConvexError("Workspace URL may only contain lowercase letters, numbers and dashes.");
    }

    const refreshToken = randomBytes(32).toString("base64url");
    const inviteCode = `INV-${randomToken(9).replace(/[-_]/g, "").slice(0, 10).toUpperCase()}`;
    const result: { userId: Id<"users">; orgId: Id<"organizations">; sessionId: Id<"sessions">; refreshExpiresAt: number } = await ctx.runMutation(internal.authInternal.createWorkspaceAndOwnerRecord, {
      companyName,
      slug,
      name,
      email,
      phone: args.phone?.trim().slice(0, 40) || undefined,
      passwordHash: await bcrypt.hash(args.password, BCRYPT_ROUNDS),
      inviteCode,
      refreshTokenHash: await sha256Hex(refreshToken),
      ip: args.ip,
      userAgent: args.userAgent,
    });

    const user: SessionUser = { _id: result.userId, email, name, role: "admin", orgId: result.orgId };
    const tokens = await issueTokens(result.sessionId, user);
    return {
      ...tokens,
      refreshToken,
      refreshTokenExpiresAt: result.refreshExpiresAt,
      user,
      orgId: result.orgId,
      inviteCode,
    };
  },
});

// ── PASSWORD RESET ───────────────────────────────────────────────────────────
/** Always resolves the same way whether or not the account exists (no enumeration). */
export const requestPasswordReset = action({
  args: { email: v.string(), ...clientMeta },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    requireServerSecret(args.serverSecret);
    const email = args.email.toLowerCase().trim().slice(0, 254);
    if (!email) return { ok: true };
    const token = randomBytes(32).toString("base64url");
    await ctx.runMutation(internal.authInternal.createPasswordReset, {
      email,
      ip: args.ip,
      userAgent: args.userAgent,
      token,
      tokenHash: await sha256Hex(token),
    });
    return { ok: true };
  },
});

export const checkPasswordResetToken = action({
  args: { token: v.string(), ...clientMeta },
  handler: async (ctx, args): Promise<{ valid: boolean }> => {
    requireServerSecret(args.serverSecret);
    if (!args.token || args.token.length > 128) return { valid: false };
    const valid: boolean = await ctx.runMutation(internal.authInternal.checkPasswordResetToken, {
      tokenHash: await sha256Hex(args.token),
      ip: args.ip,
    });
    return { valid };
  },
});

export const resetPassword = action({
  args: { token: v.string(), newPassword: v.string(), ...clientMeta },
  handler: async (ctx, args): Promise<{ success: true }> => {
    requireServerSecret(args.serverSecret);
    if (!args.token || args.token.length > 128) {
      throw new ConvexError("This reset link is invalid or has expired. Please request a new one.");
    }
    validatePasswordStrength(args.newPassword);
    await ctx.runMutation(internal.authInternal.consumePasswordReset, {
      tokenHash: await sha256Hex(args.token),
      passwordHash: await bcrypt.hash(args.newPassword, BCRYPT_ROUNDS),
      ip: args.ip,
    });
    return { success: true };
  },
});

// ── CHANGE PASSWORD (revokes all other sessions) ─────────────────────────────
export const changePassword = action({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: true }> => {
    const caller: { userId: Id<"users">; sessionId: Id<"sessions"> } | null = await ctx.runQuery(internal.sessions.resolveAccessToken, { token: args.token });
    if (!caller) throw new ConvexError("Unauthorized: Invalid session");
    await ctx.runMutation(internal.rateLimits.consume, {
      key: `pwchange:user:${caller.userId}`,
      policy: "passwordChangePerUser",
    });
    validatePasswordStrength(args.newPassword);

    const record: { passwordHash: string | null } | null = await ctx.runQuery(internal.authInternal.getUserForPasswordChange, {
      userId: caller.userId,
    });
    if (!record?.passwordHash || !(await bcrypt.compare(args.currentPassword, record.passwordHash))) {
      throw new ConvexError("Current password is incorrect.");
    }
    await ctx.runMutation(internal.authInternal.setPasswordHash, {
      userId: caller.userId,
      passwordHash: await bcrypt.hash(args.newPassword, BCRYPT_ROUNDS),
      keepSessionId: caller.sessionId,
    });
    return { success: true };
  },
});
