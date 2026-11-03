// convex/workspaces.ts
// "Find your workspace" lookup used by the sign-in flow.
// Only callable by the trusted Next.js server (AUTH_SERVER_SECRET) so it can be
// rate-limited by real client IP, which prevents enumerating every workspace.
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireServerSecret } from "./lib/serverSecret";
import { RATE_LIMITS, consumeRateLimit, ipKey } from "./lib/rateLimit";

/** Same normalisation the create-workspace form uses to derive a slug from a name. */
export function toWorkspaceSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export const findWorkspace = mutation({
  args: { serverSecret: v.string(), query: v.string(), ip: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    await consumeRateLimit(ctx, `workspace:ip:${ipKey(args.ip)}`, RATE_LIMITS.workspaceLookupPerIp);

    const slug = toWorkspaceSlug(args.query);
    if (slug.length < 2) return null;

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!org) return null;

    const canceled = (org.subscriptionStatus || "").toUpperCase() === "CANCELED";
    if (!org.isActive || canceled) return null;

    // Public, non-sensitive fields only.
    return { name: org.name, slug: org.slug, logoUrl: org.logoUrl ?? null };
  },
});
