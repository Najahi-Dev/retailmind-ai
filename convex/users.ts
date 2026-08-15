import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";
import { getSupplierForUser } from "./lib/roleGuard";

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

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      imageUrl: user.imageUrl,
      isActive: user.isActive,
    };
  },
});

// Get all users for admin management (scoped to caller's organization)
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

    if (args.role && args.role !== "all") {
      users = users.filter((u) => u.role === args.role);
    }

    if (args.status && args.status !== "all") {
      const isActive = args.status === "active";
      users = users.filter((u) => u.isActive === isActive);
    }

    return users.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get User Analytics & Role Stats (scoped to caller's organization)
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
async function syncSupplierForUserRole(ctx: any, userId: any, user: any, newRole: string, newName?: string) {
  const name = (newName || user.name || "Vendor Supplier").trim();
  const email = user.email ? user.email.trim().toLowerCase() : "";

  if (newRole === "supplier") {
    let existingSupplier = user.supplierId ? await ctx.db.get(user.supplierId) : null;

    if (!existingSupplier && email) {
      const allSuppliers = await ctx.db.query("suppliers").collect();
      existingSupplier = allSuppliers.find(
        (s: any) => s.email && s.email.trim().toLowerCase() === email
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

// Update User Role
export const updateUserRole = mutation({
  args: {
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
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User record not found");

    await ctx.db.patch(args.userId, { role: args.role });
    await syncSupplierForUserRole(ctx, args.userId, user, args.role);
  },
});

// Toggle User Active Status
export const toggleUserStatus = mutation({
  args: {
    userId: v.id("users"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
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

// Update Subscription Plan
export const updateUserPlan = mutation({
  args: {
    userId: v.id("users"),
    plan: v.union(v.literal("starter"), v.literal("growth"), v.literal("enterprise")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { plan: args.plan });
  },
});

// Create User Record
export const createUser = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
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

    const userId = await ctx.db.insert("users", {
      email: emailClean,
      name: args.name.trim(),
      phone: args.phone,
      passwordHash,
      role: args.role,
      isActive: true,
      plan: args.plan ?? "starter",
      createdAt: Date.now(),
    });

    const createdUser = await ctx.db.get(userId);
    if (createdUser) {
      await syncSupplierForUserRole(ctx, userId, createdUser, args.role, args.name);
    }

    return userId;
  },
});

// Get user detail by ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Full update of user detail
export const updateUserFullDetail = mutation({
  args: {
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
    plan: v.union(v.literal("starter"), v.literal("growth"), v.literal("enterprise")),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User record not found");

    await ctx.db.patch(args.userId, {
      name: args.name,
      phone: args.phone ?? user.phone,
      imageUrl: args.imageUrl ?? user.imageUrl,
      role: args.role,
      plan: args.plan,
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