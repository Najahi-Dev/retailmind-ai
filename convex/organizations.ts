import { mutation, query, internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import {
  getCallerUser,
  isSuperAdminUser,
  requireCallerOrg,
  requireRole,
} from "./lib/roleGuard";
import { requireServerSecret } from "./lib/serverSecret";
import { Id } from "./_generated/dataModel";
import { revokeAllUserSessions } from "./authInternal";


// ── 1. Get Current Organization Detail ──
export const getCurrentOrganization = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.token) return null;
    try {
      const { organization, user } = await requireCallerOrg(ctx, args.token);
      const isAdmin = user.role === "admin" || user.role === "super_admin";
      // Invite codes and billing identifiers are only exposed to workspace admins.
      const { inviteCode, stripeCustomerId, stripeSubscriptionId, ...publicOrg } = organization as any;
      return {
        ...publicOrg,
        ...(isAdmin ? { inviteCode, stripeCustomerId, stripeSubscriptionId } : {}),
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
        _id: org._id,
        _creationTime: org._creationTime,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        planTier: org.planTier,
        subscriptionStatus: org.subscriptionStatus,
        logoUrl: org.logoUrl,
        isActive: org.isActive,
        createdAt: org.createdAt,
        ownerId: org.ownerId,
        inviteCode:
          org.ownerId === user._id || (org._id === user.orgId && user.role === "admin")
            ? org.inviteCode
            : undefined,
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

    // Switch user to new organization and sync plan
    await ctx.db.patch(user._id, { orgId, plan: args.plan ?? "starter" });

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
      throw new ConvexError("Invalid or expired workspace invitation code.");
    }
    if (isSuperAdminUser(user)) {
      throw new ConvexError("Platform administrators cannot join a workspace by invite code.");
    }
    if (org._id === user.orgId) {
      throw new ConvexError("You are already a member of this workspace.");
    }
    if (user.orgId) {
      const currentOrg = await ctx.db.get(user.orgId as Id<"organizations">);
      if (currentOrg && currentOrg.ownerId === user._id) {
        throw new ConvexError("Workspace owners cannot leave their workspace by joining another one.");
      }
    }

    // Joining by invite code never carries over privileges: the user becomes a
    // `pending` member until an administrator of the target workspace approves
    // them and assigns a role. Pending users cannot authenticate, so all of the
    // user's sessions are revoked.
    await ctx.db.patch(user._id, {
      orgId: org._id,
      plan: org.plan,
      role: "pending",
      supplierId: undefined,
    });
    await revokeAllUserSessions(ctx, user._id, "joined_workspace_pending_approval");

    return {
      success: true,
      orgId: org._id,
      orgName: org.name,
      pendingApproval: true,
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
      throw new ConvexError("Target workspace does not exist or is inactive.");
    }
    if (org._id === user.orgId) return { success: true };

    // There is no membership table: a user belongs to exactly one org (users.orgId).
    // The only other workspaces a user is a member of are the ones they own
    // (created via createOrganization). Super admins may switch freely.
    if (!isSuperAdminUser(user) && org.ownerId !== user._id) {
      throw new ConvexError("Access Denied: You are not a member of this workspace.");
    }
    if (user._session.impersonatedBy) {
      throw new ConvexError("Access denied: Not available while impersonating");
    }

    await ctx.db.patch(user._id, { orgId: org._id, plan: org.plan });
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
      const user = await getCallerUser(ctx, args.token);
      if (!user || !user.orgId) return null;

      const org = await ctx.db.get(user.orgId as Id<"organizations">);
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
// INTERNAL ONLY: paid activation must come from verified Stripe webhooks
// (updateSubscriptionFromStripeInternal) or super-admin tooling, never the client.
export const activateSubscription = internalMutation({
  args: {
    orgId: v.id("organizations"),
    plan: v.union(v.literal("starter"), v.literal("growth"), v.literal("enterprise")),
  },
  handler: async (ctx, args) => {
    const orgId = args.orgId;
    const tier = args.plan.toUpperCase() as "STARTER" | "GROWTH" | "ENTERPRISE";
    await ctx.db.patch(orgId, {
      plan: args.plan,
      planTier: tier,
      subscriptionStatus: "ACTIVE",
      subscribedAt: Date.now(),
    });

    // Sync plan to all users in the organization
    const orgUsers = (await ctx.db.query("users").collect()).filter(u => u.orgId === orgId);
    for (const u of orgUsers) {
      await ctx.db.patch(u._id, { plan: args.plan });
    }

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
    const { orgId, organization } = await requireCallerOrg(ctx, args.token, ["admin"]);
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

    // Sync plan to all users in the organization
    const orgUsers = (await ctx.db.query("users").collect()).filter(u => u.orgId === orgId);
    for (const u of orgUsers) {
      await ctx.db.patch(u._id, { plan: args.selectedPlan });
    }

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
// These three mutations are called ONLY by the Next.js server (Stripe webhook /
// checkout routes) through ConvexHttpClient and require AUTH_SERVER_SECRET.
export const updateStripeCustomerIdInternal = mutation({
  args: {
    serverSecret: v.string(),
    orgId: v.id("organizations"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    await ctx.db.patch(args.orgId, {
      stripeCustomerId: args.stripeCustomerId,
    });
  },
});

export const updateSubscriptionFromStripeInternal = mutation({
  args: {
    serverSecret: v.string(),
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
    requireServerSecret(args.serverSecret);
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

    if (!targetOrg) {
      console.warn("updateSubscriptionFromStripeInternal: target organization could not be resolved.");
      return { success: false, reason: "Organization not found" };
    }

    // Handle planTier with proper validation - default to GROWTH only if invalid/missing
    let tier: "STARTER" | "GROWTH" | "ENTERPRISE" = "GROWTH";
    if (args.planTier !== undefined && args.planTier !== null) {
      const raw = String(args.planTier).trim();
      if (raw !== "") {
        const upper = raw.toUpperCase();
        if (upper === "STARTER" || upper === "GROWTH" || upper === "ENTERPRISE") {
          tier = upper as "STARTER" | "GROWTH" | "ENTERPRISE";
        } else {
          console.warn(`Invalid planTier value received: ${args.planTier}, defaulting to GROWTH`);
        }
      } else {
        console.warn(`Empty planTier value received, defaulting to GROWTH`);
      }
    } else {
      console.warn(`planTier is undefined or null, defaulting to GROWTH`);
    }
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

    // Sync plan to all users in the organization
    const orgUsers = (await ctx.db.query("users").collect()).filter(u => u.orgId === targetOrg._id);
    for (const u of orgUsers) {
      await ctx.db.patch(u._id, { plan: legacyPlan });
    }

    return { success: true, orgId: targetOrg._id };
  },
});

// ── 9. Direct Admin Upgrade / Sync Mutation ──
// INTERNAL ONLY (CLI / super-admin tooling): grants a paid plan without payment.
export const syncCurrentOrgToGrowth = internalMutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const orgId = args.orgId;
    await ctx.db.patch(orgId, {
      plan: "growth",
      planTier: "GROWTH",
      subscriptionStatus: "ACTIVE",
      subscribedAt: Date.now(),
    });

    // Sync plan to all users in the organization
    const orgUsers = (await ctx.db.query("users").collect()).filter(u => u.orgId === orgId);
    for (const u of orgUsers) {
      await ctx.db.patch(u._id, { plan: "growth" });
    }
    return { success: true };
  },
});

// INTERNAL ONLY (CLI): upgrades every workspace for free.
export const forceUpgradeWorkspaceToGrowth = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allOrgs = await ctx.db.query("organizations").collect();
    const allUsers = await ctx.db.query("users").collect();
    for (const org of allOrgs) {
      await ctx.db.patch(org._id, {
        plan: "growth",
        planTier: "GROWTH",
        subscriptionStatus: "ACTIVE",
        subscribedAt: Date.now(),
      });
      
      const orgUsers = allUsers.filter(u => u.orgId === org._id);
      for (const u of orgUsers) {
        await ctx.db.patch(u._id, { plan: "growth" });
      }
    }
    return { count: allOrgs.length };
  },
});

export const downgradeSubscriptionInternal = mutation({
  args: {
    serverSecret: v.string(),
    orgId: v.optional(v.id("organizations")),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
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

      // Sync plan to all users in the organization
      const orgUsers = (await ctx.db.query("users").collect()).filter(u => u.orgId === targetOrg._id);
      for (const u of orgUsers) {
        await ctx.db.patch(u._id, { plan: "starter" });
      }
    }
  },
});
