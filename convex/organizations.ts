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
    return orgs.map((org) => ({
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
