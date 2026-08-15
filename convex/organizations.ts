import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireCallerOrg, requireRole, verifyEntityOrgAccess } from "./lib/roleGuard";

// ── 1. Get Current Organization Detail ──
export const getCurrentOrganization = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.token) return null;
    const { organization, orgId, user } = await requireCallerOrg(ctx, args.token);
    return {
      ...organization,
      userRole: user.role,
      isOwner: organization.ownerId === user._id,
    };
  },
});

// ── 2. List User Organizations ──
export const getUserOrganizations = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.token) return [];
    const user = await requireRole(ctx, args.token);
    const orgs = await ctx.db.query("organizations").collect();
    
    // Strict isolation: return ONLY the workspace(s) owned by or assigned to the current user
    const userOrgs = orgs.filter((org) => org._id === user.orgId || org.ownerId === user._id);

    return userOrgs.map((org) => ({
      ...org,
      isCurrent: user.orgId === org._id,
    }));
  },
});

// ── 3. Create New Organization / Workspace ──
export const createOrganization = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    plan: v.optional(v.union(v.literal("starter"), v.literal("growth"), v.literal("enterprise"))),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.token, ["admin", "manager"]);
    const cleanName = args.name.trim();
    if (!cleanName) throw new Error("Organization name cannot be empty");

    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const inviteCode = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const orgId = await ctx.db.insert("organizations", {
      name: cleanName,
      slug,
      inviteCode,
      plan: args.plan ?? "starter",
      ownerId: user._id,
      isActive: true,
      createdAt: Date.now(),
    });

    // Switch user to new organization
    await ctx.db.patch(user._id, { orgId });

    return { orgId, slug, inviteCode };
  },
});

// ── 4. Join Organization via Invite Code ──
export const joinOrganizationByInviteCode = mutation({
  args: {
    token: v.string(),
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.token);
    const cleanCode = args.inviteCode.trim().toUpperCase();

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", cleanCode))
      .first();

    if (!org || !org.isActive) {
      throw new Error("Invalid or expired workspace invitation code.");
    }

    await ctx.db.patch(user._id, { orgId: org._id });

    return {
      success: true,
      orgId: org._id,
      orgName: org.name,
    };
  },
});

// ── 5. Switch Active Workspace ──
export const switchActiveOrganization = mutation({
  args: {
    token: v.string(),
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, args.token);
    const org = await ctx.db.get(args.orgId);
    if (!org || !org.isActive) {
      throw new Error("Target workspace does not exist or is inactive.");
    }

    await ctx.db.patch(user._id, { orgId: org._id });
    return { success: true };
  },
});

// ── 6. Get Workspace Trial Status ──
export const getTrialStatus = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.token) return null;
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token!))
      .first();

    if (!session || session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user || !user.orgId) return null;

    const org = await ctx.db.get(user.orgId);
    if (!org) return null;

    const createdAt = org.createdAt || Date.now();
    const trialDurationMs = 14 * 24 * 60 * 60 * 1000;
    const trialEndsAt = createdAt + trialDurationMs;
    const now = Date.now();
    const msRemaining = trialEndsAt - now;
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    const isSubscribed = org.subscriptionStatus === "active";
    const isTrialExpired = !isSubscribed && msRemaining <= 0;

    return {
      daysRemaining,
      isSubscribed,
      isTrialExpired,
      trialEndsAt,
      createdAt,
      plan: org.plan,
      orgName: org.name,
    };
  },
});

// ── 7. Activate Paid Subscription Package ──
export const activateSubscription = mutation({
  args: {
    token: v.optional(v.string()),
    plan: v.union(v.literal("starter"), v.literal("growth"), v.literal("enterprise")),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    await ctx.db.patch(orgId, {
      plan: args.plan,
      subscriptionStatus: "active",
      subscribedAt: Date.now(),
    });

    return { success: true };
  },
});
