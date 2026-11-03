// convex/lib/rateLimit.ts
// Token-bucket rate limiter stored in the `rateLimits` table.
// Use from mutations directly (`consumeRateLimit`) or from actions via
// `internal.rateLimits.consume`.
import { ConvexError } from "convex/values";
import { GenericMutationCtx } from "convex/server";

export type RateLimitConfig = {
  /** Maximum burst size. */
  capacity: number;
  /** Time for the bucket to fully refill from empty. */
  windowMs: number;
};

/** Named policies so limits are defined in one place. */
export const RATE_LIMITS = {
  loginPerIp: { capacity: 20, windowMs: 15 * 60 * 1000 },
  loginPerEmail: { capacity: 10, windowMs: 15 * 60 * 1000 },
  registerPerIp: { capacity: 5, windowMs: 60 * 60 * 1000 },
  refreshPerIp: { capacity: 120, windowMs: 60 * 1000 },
  passwordChangePerUser: { capacity: 5, windowMs: 60 * 60 * 1000 },
  emailPerUser: { capacity: 30, windowMs: 60 * 60 * 1000 },
  emailPerIp: { capacity: 30, windowMs: 60 * 60 * 1000 },
  expensiveJobPerOrg: { capacity: 6, windowMs: 60 * 60 * 1000 },
  apiPerIp: { capacity: 300, windowMs: 60 * 1000 },
} as const satisfies Record<string, RateLimitConfig>;

export type RateLimitName = keyof typeof RATE_LIMITS;

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

/**
 * Consumes `cost` tokens from the bucket `key`. Throws a ConvexError with
 * code RATE_LIMITED (and retryAfterMs) when the bucket is empty.
 */
export async function consumeRateLimit(
  ctx: GenericMutationCtx<any>,
  key: string,
  config: RateLimitConfig,
  cost = 1,
): Promise<{ remaining: number }> {
  const now = Date.now();
  const refillPerMs = config.capacity / config.windowMs;
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .unique();

  const current = existing
    ? Math.min(config.capacity, existing.tokens + (now - existing.updatedAt) * refillPerMs)
    : config.capacity;

  if (current < cost) {
    const retryAfterMs = Math.ceil((cost - current) / refillPerMs);
    throw new ConvexError({
      code: "RATE_LIMITED",
      message: `Too many requests. Try again in ${Math.ceil(retryAfterMs / 1000)}s.`,
      retryAfterMs,
    });
  }

  const tokens = current - cost;
  if (existing) {
    await ctx.db.patch(existing._id, { tokens, updatedAt: now });
  } else {
    await ctx.db.insert("rateLimits", { key, tokens, updatedAt: now });
  }
  return { remaining: Math.floor(tokens) };
}

/** Clears a bucket (e.g. reset per-email login limit after a successful login). */
export async function resetRateLimit(ctx: GenericMutationCtx<any>, key: string) {
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .unique();
  if (existing) await ctx.db.delete(existing._id);
}

/** Normalises an IP for use in a rate-limit key. */
export function ipKey(ip: string | undefined | null): string {
  const clean = (ip || "unknown").trim().toLowerCase().slice(0, 64);
  return clean || "unknown";
}
