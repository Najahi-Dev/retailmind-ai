import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import bcrypt from "bcryptjs";
import { getSupplierForUser, requireCallerOrg } from "./lib/roleGuard";

// Live Reactive Current User Record for Session & Instant Suspension Monitoring
export const getCurrentUserRecord = query({
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
    if (!user) return null;

    let plan = "starter";
    let planTier = "STARTER";
    let subscriptionStatus = "FREE";
    if (user.orgId) {
      const org = await ctx.db.get(user.orgId);
      if (org) {
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
    const caller = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token ?? ""))
      .first()
      .then(async (s) => (s ? await ctx.db.get(s.userId) : null));

    let users = await ctx.db.query("users").collect();
    if (caller && caller.orgId) {
      users = users.filter((u) => u.orgId === caller.orgId);
    } else {
      return [];
    }

    const org = caller?.orgId ? await ctx.db.get(caller.orgId) : null;
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
        ...u,
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
    const caller = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token ?? ""))
      .first()
      .then(async (s) => (s ? await ctx.db.get(s.userId) : null));

    if (!caller || !caller.orgId) {
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

    const allUsers = await ctx.db.query("users").collect();
    const users = allUsers.filter((u) => u.orgId === caller.orgId);

    const total = users.length;
    const adminCount = users.filter((u) => u.role === "admin").length;
    const managerCount = users.filter((u) => u.role === "manager").length;
    const staffCount = users.filter((u) => u.role === "staff").length;
    const supplierCount = users.filter((u) => u.role === "supplier").length;
    const pendingCount = users.filter((u) => u.role === "pending").length;
    const activeCount = users.filter((u) => u.isActive).length;
    const inactiveCount = total - activeCount;

    return {
      total,
      adminCount,
      managerCount,
      staffCount,
      supplierCount,
      pendingCount,
      activeCount,
      inactiveCount,
    };
  },
});

// Helper function to auto-create or update a supplier record when a user role is set to supplier
async function syncSupplierForUserRole(ctx: any, userId: any, user: any, newRole: string, newName?: string, orgId?: any) {
  const name = (newName || user.name || "Vendor Supplier").trim();
  const email = user.email ? user.email.trim().toLowerCase() : "";
  const supplierOrgId = orgId || user.orgId;

  if (newRole === "supplier") {
    let existingSupplier = user.supplierId ? await ctx.db.get(user.supplierId) : null;

    if (!existingSupplier && email) {
      const allSuppliers = await ctx.db.query("suppliers").collect();
      existingSupplier = allSuppliers.find(
        (s: any) => s.email && s.email.trim().toLowerCase() === email && (!s.orgId || s.orgId === supplierOrgId)
      );
    }

    if (existingSupplier) {
      // Update and activate existing supplier
      await ctx.db.patch(existingSupplier._id, {
        name,
        email: email || existingSupplier.email,
        phone: user.phone || existingSupplier.phone || "+94 77 123 4567",
        status: "active",
        isActive: true,
      });
      if (user.supplierId !== existingSupplier._id) {
        await ctx.db.patch(userId, { supplierId: existingSupplier._id });
      }
    } else {
      // Auto-create new supplier record on Suppliers page
      const newSupplierId = await ctx.db.insert("suppliers", {
        orgId: supplierOrgId,
        name,
        email: email || `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}@supplier.com`,
        phone: user.phone || "+94 77 123 4567",
        address: "Registered Vendor Facilities, Sri Lanka",
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
    // If role changed away from supplier, set linked supplier status to inactive
    if (user.supplierId) {
      const existingSupplier = await ctx.db.get(user.supplierId);
      if (existingSupplier) {
        await ctx.db.patch(existingSupplier._id, {
          status: "inactive",
          isActive: false,
        });
      }
    }
  }
}

// Update User Role (Admin permission check required)
export const updateUserRole = mutation({
  args: {
    token: v.optional(v.string()),
    userId: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("staff"),
      v.literal("supplier"),
      v.literal("pending")
    ),
  },
  handler: async (ctx, args) => {
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("User record not found");

    if (args.token) {
      const { orgId, organization } = await requireCallerOrg(ctx, args.token, ["admin"]);
      if (orgId && targetUser.orgId && targetUser.orgId !== orgId) {
        throw new Error("Access Denied: Cannot modify user belonging to another organization.");
      }
      if (organization.ownerId === targetUser._id && args.role !== "admin") {
        throw new Error("Workspace Owner role cannot be changed.");
      }
    }

    await ctx.db.patch(args.userId, { role: args.role });
    await syncSupplierForUserRole(ctx, args.userId, targetUser, args.role);
  },
});

// Toggle User Active Status (Admin permission check required)
export const toggleUserStatus = mutation({
  args: {
    token: v.optional(v.string()),
    userId: v.id("users"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("User record not found");

    if (args.token) {
      const { orgId, organization } = await requireCallerOrg(ctx, args.token, ["admin"]);
      if (orgId && targetUser.orgId && targetUser.orgId !== orgId) {
        throw new Error("Access Denied: Cannot modify user belonging to another organization.");
      }
      if (organization.ownerId === targetUser._id && !args.isActive) {
        throw new Error("Workspace Owner account cannot be suspended.");
      }
    }

    await ctx.db.patch(args.userId, { isActive: args.isActive });
    const user = await ctx.db.get(args.userId);
    if (user && user.supplierId) {
      const supplier = await ctx.db.get(user.supplierId);
      if (supplier) {
        await ctx.db.patch(supplier._id, {
          status: args.isActive ? "active" : "inactive",
          isActive: args.isActive,
        });
      }
    }
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
    // Plans are now organization-wide. Individual user plans are inherited.
    return { success: true, message: "Subscription plans are managed at the workspace level." };
  },
});

// Create User Record (Admin permission check & mandatory workspace orgId assignment)
export const createUser = mutation({
  args: {
    token: v.optional(v.string()),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    password: v.optional(v.string()),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("staff"),
      v.literal("supplier"),
      v.literal("pending")
    ),
    plan: v.optional(v.union(v.literal("starter"), v.literal("growth"), v.literal("enterprise"))),
    supplierId: v.optional(v.id("suppliers")),
    sendEmail: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let orgId = undefined;
    if (args.token) {
      const authResult = await requireCallerOrg(ctx, args.token, ["admin"]);
      orgId = authResult.orgId;
    }

    const emailClean = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", emailClean))
      .first();

    if (existing) {
      throw new Error(`User with email ${args.email} already exists`);
    }

    const rawPassword = args.password && args.password.trim() ? args.password : "retailmind123";
    const passwordHash = bcrypt.hashSync(rawPassword, 12);

    let orgPlan = args.plan;
    let orgName = undefined;
    if (orgId) {
      const org: any = await ctx.db.get(orgId);
      if (org) {
        if (!orgPlan && org.plan) orgPlan = org.plan;
        orgName = org.name;
      }
    }

    const userId = await ctx.db.insert("users", {
      orgId,
      email: emailClean,
      name: args.name.trim(),
      phone: args.phone,
      passwordHash,
      role: args.role,
      isActive: true,
      plan: orgPlan,
      createdAt: Date.now(),
    });

    const createdUser = await ctx.db.get(userId);
    if (createdUser) {
      await syncSupplierForUserRole(ctx, userId, createdUser, args.role, args.name, orgId);
    }

    if (args.sendEmail) {
      await ctx.scheduler.runAfter(0, api.communications.sendUserCredentialsEmail, {
        targetEmail: emailClean,
        userName: args.name.trim(),
        password: rawPassword,
        orgName,
        role: args.role,
      });
    }

    return userId;
  },
});

// Get user detail by ID (inherits organization workspace plan)
export const getUserById = query({
  args: {
    userId: v.id("users"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) return null;

    if (args.token) {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("token", args.token!))
        .first();
      if (session) {
        const caller = await ctx.db.get(session.userId);
        if (caller && caller.orgId && targetUser.orgId && targetUser.orgId !== caller.orgId) {
          throw new Error("Access Denied: User belongs to another workspace.");
        }
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
      ...targetUser,
      plan: orgPlan,
      planTier: orgPlanTier,
    };
  },
});

// Full update of user detail (Admin permission check required)
export const updateUserFullDetail = mutation({
  args: {
    token: v.optional(v.string()),
    userId: v.id("users"),
    name: v.string(),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("staff"),
      v.literal("supplier"),
      v.literal("pending")
    ),
    plan: v.optional(v.union(v.literal("starter"), v.literal("growth"), v.literal("enterprise"))),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.token) {
      const { orgId } = await requireCallerOrg(ctx, args.token, ["admin"]);
      const targetUser = await ctx.db.get(args.userId);
      if (targetUser && orgId && targetUser.orgId && targetUser.orgId !== orgId) {
        throw new Error("Access Denied: Cannot modify user belonging to another organization.");
      }
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User record not found");

    await ctx.db.patch(args.userId, {
      name: args.name,
      phone: args.phone ?? user.phone,
      imageUrl: args.imageUrl ?? user.imageUrl,
      role: args.role,
      isActive: args.isActive,
    });

    await syncSupplierForUserRole(ctx, args.userId, user, args.role, args.name);

    return { success: true };
  },
});

// Generate Convex File Upload URL for Profile Images
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Update Profile Image URL by Storage ID or Direct URL
export const updateUserProfileImage = mutation({
  args: {
    token: v.optional(v.string()),
    userId: v.id("users"),
    storageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let finalUrl = args.imageUrl;
    if (args.storageId) {
      const url = await ctx.storage.getUrl(args.storageId);
      if (url) finalUrl = url;
    }

    if (!finalUrl) throw new Error("No valid profile image provided");

    await ctx.db.patch(args.userId, {
      imageUrl: finalUrl,
    });

    return { success: true, imageUrl: finalUrl };
  },
});

export const removeUser = mutation({
  args: {
    token: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const caller = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token ?? ""))
      .first()
      .then(async (s) => (s ? await ctx.db.get(s.userId) : null));

    if (!caller || !caller.orgId || caller.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser || targetUser.orgId !== caller.orgId) {
      throw new Error("User not found or not in your organization");
    }

    if (targetUser._id === caller._id) {
      throw new Error("Cannot remove yourself from the workspace");
    }

    // Unset orgId and deactivate
    await ctx.db.patch(args.userId, {
      orgId: undefined,
      isActive: false,
      role: "pending",
    });

    return { success: true };
  },
});

// Change Authentication Password
export const changePassword = mutation({
  args: {
    token: v.optional(v.string()),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.token) throw new Error("Unauthorized: No token provided");
    
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token!))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Unauthorized: Invalid or expired session");
    }

    const caller = await ctx.db.get(session.userId);
    if (!caller) throw new Error("Unauthorized: User not found");

    if (!caller.passwordHash) {
      throw new Error("No password set for this account. Please contact administrator.");
    }

    const isValid = bcrypt.compareSync(args.currentPassword, caller.passwordHash);
    if (!isValid) throw new Error("Incorrect current password.");

    const newHash = bcrypt.hashSync(args.newPassword, 12);
    
    await ctx.db.patch(caller._id, { passwordHash: newHash });

    return { success: true };
  }
});