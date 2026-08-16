import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireCallerOrg, requireRole, verifyEntityOrgAccess } from "./lib/roleGuard";

// ── 1. Get Current Organization Detail ──
export const getCurrentOrganization = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.token) return null;
    try {
      const { organization, orgId, user } = await requireCallerOrg(ctx, args.token);
      return {
        ...organization,
        userRole: user.role,
        isOwner: organization.ownerId === user._id,
      };
    } catch (err: any) {
      // Log the error for debugging but return null to prevent UI crashes
      // The auth context will handle redirecting to sign-in if needed
      console.warn("getCurrentOrganization unauthorized:", err.message);
      return null;
    }
  },
});

// ── 2. List User Organizations ──
export const getUserOrganizations = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.token) return [];
    try {
      const user = await requireRole(ctx, args.token);
      const orgs = await ctx.db.query("organizations").collect();

      // Strict isolation: return ONLY the workspace(s) owned by or assigned to the current user
      const userOrgs = orgs.filter((org) => org._id === user.orgId || org.ownerId === user._id);

      return userOrgs.map((org) => ({
        ...org,
        isCurrent: user.orgId === org._id,
      }));
    } catch (err: any) {
      // Log the error for debugging but return empty array to prevent UI crashes
      // The auth context will handle redirecting to sign-in if needed
      console.warn("getUserOrganizations unauthorized:", err.message);
      return [];
    }
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
      isTrialUsed: false,
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
    try {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("token", args.token!))
        .first();

      if (!session || session.expiresAt < Date.now()) return null;

      const user = await ctx.db.get(session.userId);
      if (!user || !user.orgId) return null;

      const org = await ctx.db.get(user.orgId);
      if (!org) return null;

      const statusUpper = (org.subscriptionStatus || "").toUpperCase();
      const hasActiveStripeSub = Boolean(org.stripeSubscriptionId) && statusUpper !== "CANCELED" && statusUpper !== "PAST_DUE";
      const hasActiveSubscribedAt = Boolean(org.subscribedAt) && statusUpper !== "CANCELED" && statusUpper !== "PAST_DUE";
      const isSubscribed = statusUpper === "ACTIVE" || hasActiveStripeSub || hasActiveSubscribedAt;

      const createdAt = org.createdAt || Date.now();
      const trialDurationMs = 14 * 24 * 60 * 60 * 1000;
      const trialEndsAt = org.trialEndsAt || (createdAt + trialDurationMs);
      const now = Date.now();
      const msRemaining = trialEndsAt - now;
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
      const isTrialExpired = !isSubscribed && msRemaining <= 0;

      return {
        daysRemaining,
        isSubscribed,
        isTrialExpired,
        trialEndsAt,
        createdAt,
        plan: org.plan || "starter",
        planTier: org.planTier || (org.plan ? org.plan.toUpperCase() : "STARTER"),
        subscriptionStatus: org.subscriptionStatus || (isSubscribed ? "ACTIVE" : "FREE"),
        orgName: org.name,
        stripeSubscriptionId: org.stripeSubscriptionId,
        currentPeriodEnd: org.currentPeriodEnd,
        isTrialUsed: org.isTrialUsed ?? false,
      };
    } catch (err: any) {
      // Log the error for debugging but return null to prevent UI crashes
      // The auth context will handle redirecting to sign-in if needed
      console.warn("getTrialStatus unauthorized:", err.message);
      return null;
    }
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
    const tier = args.plan.toUpperCase() as "STARTER" | "GROWTH" | "ENTERPRISE";
    await ctx.db.patch(orgId, {
      plan: args.plan,
      planTier: tier,
      subscriptionStatus: "ACTIVE",
      subscribedAt: Date.now(),
    });

    return { success: true };
  },
});

// ── 7a. Activate Free Trial ──
export const activateFreeTrial = mutation({
  args: {
    token: v.optional(v.string()),
    selectedPlan: v.union(v.literal("starter"), v.literal("growth")),
  },
  handler: async (ctx, args) => {
    const { orgId, organization } = await requireCallerOrg(ctx, args.token);
    const org = organization as any;
    if (!org) throw new Error("Organization not found");
    if (org.isTrialUsed) {
      throw new Error("Free trial has already been used for this organization.");
    }
    const trialEndsAt = Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
    const tier = args.selectedPlan.toUpperCase() as "STARTER" | "GROWTH";
    await ctx.db.patch(orgId, {
      plan: args.selectedPlan,
      planTier: tier,
      subscriptionStatus: "TRIALING",
      isTrialUsed: true,
      trialEndsAt: trialEndsAt,
    });

    return { success: true };
  },
});

// ── 7b. Get Workspace Billing Information ──
export const getWorkspaceBilling = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organization } = await requireCallerOrg(ctx, args.token);
    const org = organization as any;
    if (!org) {
      return {
        isExpired: false,
        trialDaysRemaining: 0,
        plan: "starter",
        planTier: "STARTER",
        subscriptionStatus: "FREE",
        isTrialUsed: false,
        trialEndsAt: undefined,
        currentPeriodEnd: undefined,
        subscribedAt: undefined,
      };
    }

    const statusUpper = (org.subscriptionStatus || "").toUpperCase();
    const hasActiveStripeSub = Boolean(org.stripeSubscriptionId) && statusUpper !== "CANCELED" && statusUpper !== "PAST_DUE";
    const hasActiveSubscribedAt = Boolean(org.subscribedAt) && statusUpper !== "CANCELED" && statusUpper !== "PAST_DUE";
    const isSubscribed = statusUpper === "ACTIVE" || hasActiveStripeSub || hasActiveSubscribedAt;

    const createdAt = org.createdAt || Date.now();
    const trialDurationMs = 14 * 24 * 60 * 60 * 1000;
    const trialEndsAt = org.trialEndsAt || (createdAt + trialDurationMs);
    const now = Date.now();
    const msRemaining = trialEndsAt - now;
    const trialDaysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    const isExpired = statusUpper === "TRIALING" && now > trialEndsAt;

    return {
      isExpired,
      trialDaysRemaining,
      plan: org.plan || "starter",
      planTier: org.planTier ?? (org.plan ? org.plan.toUpperCase() : "STARTER"),
      subscriptionStatus: org.subscriptionStatus ?? (isSubscribed ? "ACTIVE" : "FREE"),
      isTrialUsed: org.isTrialUsed ?? false,
      trialEndsAt: org.trialEndsAt,
      currentPeriodEnd: org.currentPeriodEnd,
      subscribedAt: org.subscribedAt,
    };
  },
});

// ── 8. Billing Mutations for Webhooks & Server APIs ──
export const updateStripeCustomerIdInternal = mutation({
  args: {
    orgId: v.id("organizations"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orgId, {
      stripeCustomerId: args.stripeCustomerId,
    });
  },
});

export const updateSubscriptionFromStripeInternal = mutation({
  args: {
    orgId: v.optional(v.id("organizations")),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    userId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    planTier: v.optional(v.union(v.literal("STARTER"), v.literal("GROWTH"), v.literal("ENTERPRISE"))),
    subscriptionStatus: v.union(
      v.literal("FREE"),
      v.literal("TRIALING"),
      v.literal("ACTIVE"),
      v.literal("PAST_DUE"),
      v.literal("CANCELED")
    ),
    trialEndsAt: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let targetOrg: any = null;

    if (args.orgId) {
      try {
        const item: any = await ctx.db.get(args.orgId);
        if (item) {
          if ("slug" in item || "inviteCode" in item) {
            targetOrg = item;
          } else if ("orgId" in item && item.orgId) {
            targetOrg = await ctx.db.get(item.orgId);
          }
        }
      } catch {}
    }

    if (!targetOrg && args.userId) {
      try {
        const user: any = await ctx.db.get(args.userId as any);
        if (user && "orgId" in user && user.orgId) {
          targetOrg = await ctx.db.get(user.orgId);
        }
      } catch {}
      if (!targetOrg) {
        const allUsers = await ctx.db.query("users").collect();
        const matchedUser = allUsers.find(
          (u) => u._id === args.userId || (u as any).clerkId === args.userId || u.email === args.userId
        );
        if (matchedUser?.orgId) {
          targetOrg = await ctx.db.get(matchedUser.orgId);
        }
      }
    }

    if (!targetOrg && args.stripeCustomerId) {
      const allOrgs = await ctx.db.query("organizations").collect();
      targetOrg = allOrgs.find((o) => o.stripeCustomerId === args.stripeCustomerId);
    }

    if (!targetOrg && args.stripeSubscriptionId) {
      const allOrgs = await ctx.db.query("organizations").collect();
      targetOrg = allOrgs.find((o) => o.stripeSubscriptionId === args.stripeSubscriptionId);
    }

    // Single organization fallback if webhook metadata was ambiguous
    if (!targetOrg) {
      const allOrgs = await ctx.db.query("organizations").collect();
      if (allOrgs.length === 1) {
        targetOrg = allOrgs[0];
      }
    }

    if (!targetOrg) {
      console.warn("updateSubscriptionFromStripeInternal: target organization could not be resolved.");
      return { success: false, reason: "Organization not found" };
    }

    const tier = args.planTier || "GROWTH";
    const legacyPlan = tier.toLowerCase() as "starter" | "growth" | "enterprise";

    await ctx.db.patch(targetOrg._id, {
      stripeSubscriptionId: args.stripeSubscriptionId ?? targetOrg.stripeSubscriptionId,
      stripeCustomerId: args.stripeCustomerId ?? targetOrg.stripeCustomerId,
      stripePriceId: args.stripePriceId ?? targetOrg.stripePriceId,
      planTier: tier,
      plan: legacyPlan,
      subscriptionStatus: args.subscriptionStatus,
      trialEndsAt: args.trialEndsAt,
      currentPeriodEnd: args.currentPeriodEnd ?? targetOrg.currentPeriodEnd,
      subscribedAt: args.subscriptionStatus === "ACTIVE" ? (targetOrg.subscribedAt || Date.now()) : targetOrg.subscribedAt,
    });

    return { success: true, orgId: targetOrg._id };
  },
});

// ── 9. Direct Admin Upgrade / Sync Mutation ──
export const syncCurrentOrgToGrowth = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, ["admin", "manager"]);
    await ctx.db.patch(orgId, {
      plan: "growth",
      planTier: "GROWTH",
      subscriptionStatus: "ACTIVE",
      subscribedAt: Date.now(),
    });
    return { success: true };
  },
});

export const forceUpgradeWorkspaceToGrowth = mutation({
  args: {},
  handler: async (ctx) => {
    const allOrgs = await ctx.db.query("organizations").collect();
    for (const org of allOrgs) {
      await ctx.db.patch(org._id, {
        plan: "growth",
        planTier: "GROWTH",
        subscriptionStatus: "ACTIVE",
        subscribedAt: Date.now(),
      });
    }
    return { count: allOrgs.length };
  },
});

export const downgradeSubscriptionInternal = mutation({
  args: {
    orgId: v.optional(v.id("organizations")),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let targetOrg: any = null;

    if (args.orgId) {
      targetOrg = await ctx.db.get(args.orgId);
    }

    if (!targetOrg && args.stripeCustomerId) {
      const allOrgs = await ctx.db.query("organizations").collect();
      targetOrg = allOrgs.find((o) => o.stripeCustomerId === args.stripeCustomerId);
    }

    if (!targetOrg && args.stripeSubscriptionId) {
      const allOrgs = await ctx.db.query("organizations").collect();
      targetOrg = allOrgs.find((o) => o.stripeSubscriptionId === args.stripeSubscriptionId);
    }

    if (targetOrg) {
      await ctx.db.patch(targetOrg._id, {
        planTier: "STARTER",
        plan: "starter",
        subscriptionStatus: "CANCELED",
      });
    }
  },
});
