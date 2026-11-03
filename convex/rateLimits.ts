// convex/rateLimits.ts
import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { RATE_LIMITS, RateLimitName, consumeRateLimit, ipKey } from "./lib/rateLimit";
import { requireServerSecret } from "./lib/serverSecret";

const policy = v.union(...(Object.keys(RATE_LIMITS) as RateLimitName[]).map((k) => v.literal(k)));

/** For actions: consume from a named policy bucket. Throws RATE_LIMITED. */
export const consume = internalMutation({
  args: { key: v.string(), policy, cost: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await consumeRateLimit(ctx, args.key, RATE_LIMITS[args.policy], args.cost ?? 1);
  },
});

/**
 * For the trusted Next.js server only (requires AUTH_SERVER_SECRET): per-IP limits
 * on API route handlers such as the e-mail endpoints.
 */
export const consumeForIp = mutation({
  args: { serverSecret: v.string(), scope: v.string(), ip: v.string(), policy },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    return await consumeRateLimit(
      ctx,
      `${args.scope.slice(0, 64)}:ip:${ipKey(args.ip)}`,
      RATE_LIMITS[args.policy],
    );
  },
});
