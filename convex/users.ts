import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import bcrypt from "bcryptjs";
import {
  isSuperAdminUser,
  getCallerUser,
  requireCallerOrg,
  requireRole,
  sanitizeUser,
} from "./lib/roleGuard";
import { revokeAllUserSessions } from "./authInternal";
import { validatePasswordStrength } from "./lib/password";

// Roles that may manage other users inside their own workspace.
const USER_MANAGER_ROLES = ["admin", "manager"];

const assignableRole = v.union(
  v.literal("admin"),
  v.literal("manager"),
  v.literal("staff"),
  v.literal("supplier"),
  v.literal("pending"),
);

/**
 * Central authorization policy for one user acting on another user record.
 *  - target must be in the caller's organization
 *  - super admins can never be modified from tenant-level functions
 *  - managers may not modify admins nor grant the admin role
 *  - nobody may change their own role
 *  - the workspace owner's role can't be changed and the owner can't be deactivated
 */
function assertCanManageUser(
  caller: { _id: Id<"users">; role: string; orgId?: Id<"organizations"> },
  organization: { ownerId?: Id<"users"> },
  target: any,
  changes: { role?: string; isActive?: boolean } = {},
) {
  if (!target || !caller.orgId || target.orgId !== caller.orgId) {
    throw new ConvexError("User not found in your organization.");
  }
  if (isSuperAdminUser(target)) {
    throw new ConvexError("Access denied: platform administrators cannot be modified here.");
  }
  const isSelf = target._id === caller._id;
  if (!isSelf && !USER_MANAGER_ROLES.includes(caller.role)) {
    throw new ConvexError("Access denied: You cannot modify another user's account.");
  }
  if (!isSelf && caller.role === "manager" && target.role === "admin") {
    throw new ConvexError("Access denied: Managers cannot modify administrator accounts.");
  }
  if (changes.role !== undefined && changes.role !== target.role) {
    if (isSelf) throw new ConvexError("You cannot change your own role.");
    if (changes.role === "super_admin") throw new ConvexError("Access denied.");
    if (changes.role === "admin" && caller.role !== "admin") {
      throw new ConvexError("Access denied: Only administrators can grant the admin role.");
    }
    if (organization.ownerId === target._id) {
      throw new ConvexError("Workspace Owner role cannot be changed.");
    }
  }
  if (changes.isActive !== undefined && changes.isActive !== target.isActive) {
    if (isSelf) throw new ConvexError("You cannot change your own account status.");
    if (!changes.isActive && organization.ownerId === target._id) {
      throw new ConvexError("Workspace Owner account cannot be suspended.");
    }
  }
}

async function setUserActive(ctx: any, user: any, isActive: boolean) {
  await ctx.db.patch(user._id, { isActive });
  if (!isActive) await revokeAllUserSessions(ctx, user._id, "user_deactivated");
  if (user.supplierId) {
    const supplier = await ctx.db.get(user.supplierId);
    if (supplier && supplier.orgId === user.orgId) {
      await ctx.db.patch(supplier._id, { status: isActive ? "active" : "inactive", isActive });
    }
  }
}

// Live Reactive Current User Record for Session & Instant Suspension Monitoring
export const getCurrentUserRecord = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCallerUser(ctx, args.token);
    if (!user) return null;

    let plan = "starter";
    let planTier = "STARTER";
    let subscriptionStatus = "FREE";
    if (user.orgId) {
      const org = await ctx.db.get(user.orgId as Id<"organizations">);
      if (org) {
        const isOrgSuspended =
          org.isActive === false ||
          (org.subscriptionStatus || "").toUpperCase() === "CANCELED";

        if (isOrgSuspended && !isSuperAdminUser(user)) {
          return null; // Forces immediate reactive logout in auth-context.tsx
        }

        plan = org.plan || "starter";
        planTier = org.planTier || (org.plan ? org.plan.toUpperCase() : "STARTER");
        subscriptionStatus = org.subscriptionStatus || "FREE";
      }
    }

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan,
      planTier,
      subscriptionStatus,
      orgId: user.orgId,
      imageUrl: user.imageUrl,
      isActive: user.isActive,
      isImpersonating: !!user._session.impersonatedBy,
    };
  },
});

// Get all users for admin management (scoped strictly to caller's organization)
export const getUsers = query({
  args: {
    token: v.optional(v.string()),
    role: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);
    if (!caller || !caller.orgId || !USER_MANAGER_ROLES.includes(caller.role)) return [];
    const orgId = caller.orgId as Id<"organizations">;

    let users = await ctx.db
      .query("users")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    const org = await ctx.db.get(orgId);
    const orgPlan = org?.plan || "starter";
    const orgPlanTier = org?.planTier || (org?.plan ? org.plan.toUpperCase() : "STARTER");

    if (args.role && args.role !== "all") {
      users = users.filter((u) => u.role === args.role);
    }

    if (args.status && args.status !== "all") {
      const isActive = args.status === "active";
      users = users.filter((u) => u.isActive === isActive);
    }

    return users
      .map((u) => ({
        ...sanitizeUser(u),
        plan: orgPlan,
        planTier: orgPlanTier,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get User Analytics & Role Stats (scoped strictly to caller's organization)
export const getUserStats = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await getCallerUser(ctx, args.token);

    if (!caller || !caller.orgId || !USER_MANAGER_ROLES.includes(caller.role)) {
      return {
        total: 0,
        adminCount: 0,
        managerCount: 0,
        staffCount: 0,
        supplierCount: 0,
        pendingCount: 0,
        activeCount: 0,
        inactiveCount: 0,
      };
    }
    const orgId = caller.orgId as Id<"organizations">;

    const users = await ctx.db
      .query("users")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .collect();

    const total = users.length;
    const activeCount = users.filter((u) => u.isActive).length;

    return {
      total,
      adminCount: users.filter((u) => u.role === "admin").length,
      managerCount: users.filter((u) => u.role === "manager").length,
      staffCount: users.filter((u) => u.role === "staff").length,
      supplierCount: users.filter((u) => u.role === "supplier").length,
      pendingCount: users.filter((u) => u.role === "pending").length,
      activeCount,
      inactiveCount: total - activeCount,
    };
  },
});

// Helper function to auto-create or update a supplier record when a user role is set to supplier.
// Only suppliers inside the user's own organization are ever linked.
async function syncSupplierForUserRole(ctx: any, userId: any, user: any, newRole: string, newName?: string) {
  const name = (newName || user.name || "Vendor Supplier").trim();
  const email = user.email ? user.email.trim().toLowerCase() : "";
  const supplierOrgId = user.orgId;
  if (!supplierOrgId) return;

  if (newRole === "supplier") {
    let existingSupplier = user.supplierId ? await ctx.db.get(user.supplierId) : null;
    if (existingSupplier && existingSupplier.orgId !== supplierOrgId) existingSupplier = null;

    if (!existingSupplier && email) {
      const orgSuppliers = await ctx.db
        .query("suppliers")
        .withIndex("by_org", (q: any) => q.eq("orgId", supplierOrgId))
        .collect();
      existingSupplier =
        orgSuppliers.find((s: any) => s.email && s.email.trim().toLowerCase() === email) ?? null;
    }

    if (existingSupplier) {
      await ctx.db.patch(existingSupplier._id, {
        name,
        email: email || existingSupplier.email,
        phone: user.phone || existingSupplier.phone,
        status: "active",
        isActive: true,
      });
      if (user.supplierId !== existingSupplier._id) {
        await ctx.db.patch(userId, { supplierId: existingSupplier._id });
      }
    } else {
      const newSupplierId = await ctx.db.insert("suppliers", {
        orgId: supplierOrgId,
        name,
        email: email || `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}@supplier.com`,
        phone: user.phone,
        leadTimeDays: 3,
        paymentTerms: "Net 30",
        status: "active",
        reliabilityScore: 95,
        isActive: true,
        createdAt: Date.now(),
      });
      await ctx.db.patch(userId, { supplierId: newSupplierId });
    }
  } else if (user.role === "supplier" && newRole !== "supplier") {
    if (user.supplierId) {
      const existingSupplier = await ctx.db.get(user.supplierId);
      if (existingSupplier && existingSupplier.orgId === supplierOrgId) {
        await ctx.db.patch(existingSupplier._id, { status: "inactive", isActive: false });
      }
    }
  }
}

// Update User Role (admin / manager of the same workspace)
export const updateUserRole = mutation({
  args: {
    token: v.optional(v.string()),
    userId: v.id("users"),
    role: assignableRole,
  },
  handler: async (ctx, args) => {
    const { user: caller, organization } = await requireCallerOrg(ctx, args.token, USER_MANAGER_ROLES);
    const targetUser = await ctx.db.get(args.userId);
    assertCanManageUser(caller, organization, targetUser, { role: args.role });

    await ctx.db.patch(args.userId, { role: args.role });
    await syncSupplierForUserRole(ctx, args.userId, targetUser, args.role);
  },
});

// Toggle User Active Status (admin / manager of the same workspace)
export const toggleUserStatus = mutation({
  args: {
    token: v.optional(v.string()),
    userId: v.id("users"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user: caller, organization } = await requireCallerOrg(ctx, args.token, USER_MANAGER_ROLES);
    const targetUser = await ctx.db.get(args.userId);
    assertCanManageUser(caller, organization, targetUser, { isActive: args.isActive });

    await setUserActive(ctx, targetUser, args.isActive);
  },
});

// Update Subscription Plan (Maintained for backward compatibility, now explains workspace inheritance)
export const updateUserPlan = mutation({
  args: {
    token: v.optional(v.string()),
    userId: v.id("users"),
    plan: v.optional(v.union(v.literal("starter"), v.literal("growth"), v.literal("enterprise"))),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.token);
    // Plans are now organization-wide. Individual user plans are inherited.
    return { success: true, message: "Subscription plans are managed at the workspace level." };
  },
});

// ── Create user (admin / manager) ───────────────────────────────────────────
// Implemented as an action so the temporary password is generated with real
// (non-deterministic) randomness and bcrypt runs outside the mutation.

const TEMP_PW_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generateTemporaryPassword(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let pw = "";
  for (const b of bytes) pw += TEMP_PW_CHARS[b % TEMP_PW_CHARS.length];
  // Guarantee the policy's character classes.
  return `${pw}Aa7`;
}

async function assertCanCreateUser(ctx: any, token: string | undefined, role: string, email: string) {
  const auth = await requireCallerOrg(ctx, token, USER_MANAGER_ROLES);
  if (role === "admin" && auth.user.role !== "admin") {
    throw new ConvexError("Access denied: Only administrators can create administrator accounts.");
  }
  const existing = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();
  if (existing) throw new ConvexError(`User with email ${email} already exists`);
  return auth;
}

export const authorizeUserCreation = internalQuery({
  args: { token: v.optional(v.string()), role: assignableRole, email: v.string() },
  handler: async (ctx, args) => {
    await assertCanCreateUser(ctx, args.token, args.role, args.email);
    return null;
  },
});

export const insertManagedUser = internalMutation({
  args: {
    token: v.optional(v.string()),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: assignableRole,
    supplierId: v.optional(v.id("suppliers")),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const { user: caller, orgId, organization } = await assertCanCreateUser(
      ctx,
      args.token,
      args.role,
      args.email,
    );

    let supplierId: Id<"suppliers"> | undefined = undefined;
    if (args.supplierId) {
      const supplier = await ctx.db.get(args.supplierId);
      if (!supplier || supplier.orgId !== orgId) {
        throw new ConvexError("Access Denied: Supplier belongs to another organization.");
      }
      supplierId = supplier._id;
    }

    const userId = await ctx.db.insert("users", {
      orgId,
      email: args.email,
      name: args.name,
      phone: args.phone,
      passwordHash: args.passwordHash,
      role: args.role,
      isActive: true,
      plan: organization.plan,
      supplierId: args.role === "supplier" ? supplierId : undefined,
      createdAt: Date.now(),
    });

    const createdUser = await ctx.db.get(userId);
    if (createdUser) {
      await syncSupplierForUserRole(ctx, userId, createdUser, args.role, args.name);
    }

    return {
      userId,
      inviterName: caller.name,
      inviterEmail: caller.email,
      orgName: organization.name,
    };
  },
});

export const createUser = action({
  args: {
    token: v.optional(v.string()),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    password: v.optional(v.string()),
    role: assignableRole,
    plan: v.optional(v.union(v.literal("starter"), v.literal("growth"), v.literal("enterprise"))),
    supplierId: v.optional(v.id("suppliers")),
    sendEmail: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ userId: Id<"users">; temporaryPassword?: string }> => {
    const email = args.email.trim().toLowerCase();
    const name = args.name.trim();
    if (!name) throw new ConvexError("Name is required.");
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ConvexError("Please enter a valid email address.");
    }

    // Cheap authorization check before spending CPU on bcrypt.
    await ctx.runQuery(internal.users.authorizeUserCreation, {
      token: args.token,
      role: args.role,
      email,
    });

    const providedPassword = args.password && args.password.trim() ? args.password : undefined;
    if (providedPassword) validatePasswordStrength(providedPassword);
    const rawPassword = providedPassword ?? generateTemporaryPassword();
    const passwordHash = bcrypt.hashSync(rawPassword, 12);

    const result: {
      userId: Id<"users">;
      inviterName: string;
      inviterEmail: string;
      orgName: string;
    } = await ctx.runMutation(internal.users.insertManagedUser, {
      token: args.token,
      name,
      email,
      phone: args.phone,
      role: args.role,
      supplierId: args.supplierId,
      passwordHash,
    });

    if (args.sendEmail) {
      await ctx.scheduler.runAfter(0, internal.mailer.sendWorkspaceUserInviteEmail, {
        toEmail: email,
        toName: name,
        inviterName: result.inviterName,
        inviterEmail: result.inviterEmail,
        workspaceName: result.orgName || "RetailMind AI",
        temporaryPassword: rawPassword,
        loginUrl: process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
          : "https://app.retailmind.ai/login",
      });
    }

    // A generated password that was not e-mailed is shown once to the creating admin.
    return {
      userId: result.userId,
      temporaryPassword: !providedPassword && !args.sendEmail ? rawPassword : undefined,
    };
  },
});

// ── Supplier login access (admin / manager) ────────────────────────────────

/** Finds the login account linked to a supplier (by supplierId, then by email). */
async function findSupplierLoginUser(ctx: any, orgId: Id<"organizations">, supplierId: Id<"suppliers">) {
  const supplier = await ctx.db.get(supplierId);
  if (!supplier || supplier.orgId !== orgId) {
    throw new ConvexError("Supplier not found in your organization.");
  }
  const orgUsers = await ctx.db
    .query("users")
    .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
    .collect();
  const supplierEmail = supplier.email?.trim().toLowerCase();
  const user =
    orgUsers.find((u: any) => u.supplierId === supplierId) ??
    orgUsers.find(
      (u: any) => u.role === "supplier" && supplierEmail && u.email.trim().toLowerCase() === supplierEmail,
    ) ??
    null;
  return { supplier, user };
}

export const getSupplierLoginAccount = query({
  args: { token: v.optional(v.string()), supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    const { orgId } = await requireCallerOrg(ctx, args.token, USER_MANAGER_ROLES);
    const { user } = await findSupplierLoginUser(ctx, orgId, args.supplierId);
    if (!user) return null;
    return {
      userId: user._id,
      email: user.email,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      passwordChangedAt: user.passwordChangedAt,
    };
  },
});

async function assertCanSetSupplierPassword(ctx: any, token: string | undefined, supplierId: Id<"suppliers">) {
  const { user: caller, orgId, organization } = await requireCallerOrg(ctx, token, USER_MANAGER_ROLES);
  const { user } = await findSupplierLoginUser(ctx, orgId, supplierId);
  if (!user) throw new ConvexError("This supplier has no login account yet.");
  assertCanManageUser(caller, organization, user);
  if (user._id === caller._id) {
    throw new ConvexError("Use Settings to change your own password.");
  }
  return user;
}

export const authorizeSupplierPasswordUpdate = internalQuery({
  args: { token: v.optional(v.string()), supplierId: v.id("suppliers") },
  handler: async (ctx, args) => {
    await assertCanSetSupplierPassword(ctx, args.token, args.supplierId);
    return null;
  },
});

export const applySupplierPassword = internalMutation({
  args: { token: v.optional(v.string()), supplierId: v.id("suppliers"), passwordHash: v.string() },
  handler: async (ctx, args) => {
    const user = await assertCanSetSupplierPassword(ctx, args.token, args.supplierId);
    await ctx.db.patch(user._id, {
      passwordHash: args.passwordHash,
      passwordChangedAt: Date.now(),
      failedLoginCount: 0,
      lockedUntil: undefined,
    });
    // Existing sessions must sign in again with the new password.
    await revokeAllUserSessions(ctx, user._id, "password_reset_by_admin");
    return { email: user.email };
  },
});

export const setSupplierPassword = action({
  args: { token: v.optional(v.string()), supplierId: v.id("suppliers"), password: v.string() },
  handler: async (ctx, args): Promise<{ email: string }> => {
    // Cheap authorization check before spending CPU on bcrypt.
    await ctx.runQuery(internal.users.authorizeSupplierPasswordUpdate, {
      token: args.token,
      supplierId: args.supplierId,
    });
    validatePasswordStrength(args.password);
    const passwordHash = await bcrypt.hash(args.password, 12);
    return await ctx.runMutation(internal.users.applySupplierPassword, {
      token: args.token,
      supplierId: args.supplierId,
      passwordHash,
    });
  },
});

// Get user detail by ID: self, or admin/manager of the same workspace.
export const getUserById = query({
  args: {
    userId: v.id("users"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await requireRole(ctx, args.token);
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) return null;

    const isSelf = targetUser._id === caller._id;
    if (!isSelf && !isSuperAdminUser(caller)) {
      if (!caller.orgId || targetUser.orgId !== caller.orgId) {
        throw new ConvexError("Access Denied: User belongs to another workspace.");
      }
      if (!USER_MANAGER_ROLES.includes(caller.role)) {
        throw new ConvexError("Access Denied: You cannot view another user's profile.");
      }
    }

    let orgPlan = "starter";
    let orgPlanTier = "STARTER";
    if (targetUser.orgId) {
      const org = await ctx.db.get(targetUser.orgId);
      if (org) {
        orgPlan = org.plan || "starter";
        orgPlanTier = org.planTier || (org.plan ? org.plan.toUpperCase() : "STARTER");
      }
    }

    return {
      ...sanitizeUser(targetUser),
      plan: orgPlan,
      planTier: orgPlanTier,
    };
  },
});

// Full update of user detail. Admins/managers may edit users of their own
// workspace (subject to assertCanManageUser); any user may edit their own
// name / phone / avatar but not their own role or status.
export const updateUserFullDetail = mutation({
  args: {
    token: v.optional(v.string()),
    userId: v.id("users"),
    name: v.string(),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: assignableRole,
    plan: v.optional(v.union(v.literal("starter"), v.literal("growth"), v.literal("enterprise"))),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user: caller, organization } = await requireCallerOrg(ctx, args.token);
    const user = await ctx.db.get(args.userId);
    assertCanManageUser(caller, organization, user, { role: args.role, isActive: args.isActive });
    if (!user) throw new ConvexError("User record not found");

    const name = args.name.trim();
    if (!name) throw new ConvexError("User name cannot be empty");

    await ctx.db.patch(args.userId, {
      name,
      phone: args.phone ?? user.phone,
      imageUrl: args.imageUrl ?? user.imageUrl,
      role: args.role,
    });

    if (args.isActive !== user.isActive) {
      await setUserActive(ctx, user, args.isActive);
    }

    await syncSupplierForUserRole(ctx, args.userId, user, args.role, name);

    return { success: true };
  },
});

// Generate Convex File Upload URL for Profile Images (authenticated users only)
export const generateUploadUrl = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.token);
    return await ctx.storage.generateUploadUrl();
  },
});

// Update Profile Image URL by Storage ID or Direct URL (self or workspace admin/manager)
export const updateUserProfileImage = mutation({
  args: {
    token: v.optional(v.string()),
    userId: v.id("users"),
    storageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user: caller, organization } = await requireCallerOrg(ctx, args.token);
    const target = await ctx.db.get(args.userId);
    assertCanManageUser(caller, organization, target);

    let finalUrl = args.imageUrl;
    if (args.storageId) {
      const url = await ctx.storage.getUrl(args.storageId);
      if (url) finalUrl = url;
    }

    if (!finalUrl) throw new ConvexError("No valid profile image provided");
    if (!/^https:\/\//i.test(finalUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)/i.test(finalUrl)) {
      throw new ConvexError("Profile image must be an https URL");
    }

    await ctx.db.patch(args.userId, { imageUrl: finalUrl });

    return { success: true, imageUrl: finalUrl };
  },
});

// Remove a user from the workspace (admin only)
export const removeUser = mutation({
  args: {
    token: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { user: caller, organization } = await requireCallerOrg(ctx, args.token, ["admin"]);
    const targetUser = await ctx.db.get(args.userId);

    if (targetUser && targetUser._id === caller._id) {
      throw new ConvexError("Cannot remove yourself from the workspace");
    }
    assertCanManageUser(caller, organization, targetUser, { isActive: false });

    await setUserActive(ctx, targetUser, false);
    await ctx.db.patch(args.userId, {
      orgId: undefined,
      role: "pending",
      supplierId: undefined,
    });

    return { success: true };
  },
});
