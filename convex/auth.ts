"use node";
// convex/auth.ts
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { isSuperAdminUser } from "./lib/roleGuard";

const JWT_SECRET = process.env.JWT_SECRET || "retailmind-secret-jwt-key-2026";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── 1. LOGIN USER ──
export const loginUser = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    let user: any = await ctx.runQuery(api.authInternal.getUserByEmail, {
      email: args.email.toLowerCase().trim(),
    });

    const cleanEmail = args.email.toLowerCase().trim();
    let isSuperAdmin =
      cleanEmail === "admin@retailmind.com" ||
      cleanEmail === "ahmednajahi2003@gmail.com" ||
      user?.role === "super_admin";

    if (!user) {
      // Auto-create default admin account or dev account if logging in for the first time
      if (isSuperAdmin || cleanEmail === "devnaja.arcade@gmail.com") {
        const passwordHash = bcrypt.hashSync(args.password, 10);
        const role = isSuperAdmin ? "super_admin" : "admin";
        const name = cleanEmail === "admin@retailmind.com" ? "Super Admin" : "Dev Naja";
        
        const userId: any = await ctx.runMutation(api.authInternal.createUserRecord, {
          email: cleanEmail,
          passwordHash,
          name,
          role,
        });

        user = {
          _id: userId,
          email: cleanEmail,
          name,
          role,
          passwordHash,
          isActive: true,
        };
      } else {
        throw new ConvexError("User not found. Click 'Create Account' to register.");
      }
    }

    isSuperAdmin = isSuperAdminUser(user);

    // Auto-promote super admin accounts to super_admin role
    if (isSuperAdmin && user.role !== "super_admin") {
      await ctx.runMutation(api.authInternal.updateUserRole, {
        userId: user._id,
        role: "super_admin",
      });
      user.role = "super_admin";
    }

    // Auto-reactivate super admin account if inactive
    if (isSuperAdmin && user.isActive === false) {
      await ctx.runMutation(api.authInternal.updateUserStatus, {
        userId: user._id,
        isActive: true,
      });
      user.isActive = true;
    }

    if (user.role === "pending" && !isSuperAdmin) {
      throw new ConvexError("Your user role is not assigned. Waiting for the admin approval.");
    }

    // Only non-super-admin users are blocked when their workspace is suspended
    if (user.orgId && !isSuperAdmin) {
      const org = await ctx.runQuery(api.authInternal.getOrganizationById, { orgId: user.orgId });
      if (org) {
        const isOrgSuspended =
          org.isActive === false ||
          (org.subscriptionStatus || "").toUpperCase() === "CANCELED";
        if (isOrgSuspended) {
          throw new ConvexError("Workspace suspended: Your organization account has been suspended or canceled by an administrator. Please contact support.");
        }
      }
    }

    if (user.isActive === false && !isSuperAdmin) {
      if (user.role === "supplier") {
        await ctx.runMutation(api.authInternal.updateUserStatus, {
          userId: user._id,
          isActive: true,
        });
        user.isActive = true;
      } else {
        throw new ConvexError("Account suspended: Your user account has been deactivated. Contact your administrator.");
      }
    }

    if (!user.passwordHash) {
      const defaultHash = bcrypt.hashSync(args.password, 10);
      await ctx.runMutation(api.authInternal.updateUserPassword, {
        userId: user._id,
        passwordHash: defaultHash,
      });
      user.passwordHash = defaultHash;
    }

    const isValidPassword = bcrypt.compareSync(args.password, user.passwordHash);
    if (!isValidPassword) {
      throw new ConvexError("Invalid email or password");
    }

    const expiresAt = Date.now() + SESSION_DURATION;
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        exp: Math.floor(expiresAt / 1000),
      },
      JWT_SECRET
    );

    await ctx.runMutation(api.authInternal.createSessionRecord, {
      userId: user._id,
      token,
      expiresAt,
    });

    return {
      token,
      userId: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      imageUrl: user.imageUrl,
    };
  },
});

// ── 2. REGISTER USER ──
export const registerUser = action({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    role: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const role = "pending";

    const passwordHash = bcrypt.hashSync(args.password, 10);

    const userId: any = await ctx.runMutation(api.authInternal.createUserRecord, {
      email,
      passwordHash,
      name: args.name,
      phone: args.phone,
      role,
      imageUrl: args.imageUrl,
    });

    return {
      isPending: true,
      userId,
      email,
      name: args.name,
      role: "pending",
      message: "Account registered successfully! Your account is currently pending administrator role assignment and approval.",
    };
  },
});

// ── 3. REGISTER WORKSPACE & ADMIN OWNER ──
export const registerWorkspaceAndOwner = action({
  args: {
    companyName: v.string(),
    slug: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    const passwordHash = bcrypt.hashSync(args.password, 10);
    const { userId, orgId, inviteCode } = await ctx.runMutation(
      api.authInternal.createWorkspaceAndOwnerRecord,
      {
        companyName: args.companyName.trim(),
        slug: args.slug.toLowerCase().trim(),
        name: args.name.trim(),
        email: args.email.toLowerCase().trim(),
        phone: args.phone?.trim() || undefined,
        passwordHash,
      }
    );

    const expiresAt = Date.now() + SESSION_DURATION;
    const token = jwt.sign(
      {
        userId,
        orgId,
        email: args.email.toLowerCase().trim(),
        name: args.name.trim(),
        role: "admin",
        exp: Math.floor(expiresAt / 1000),
      },
      JWT_SECRET
    );

    await ctx.runMutation(api.authInternal.createSessionRecord, {
      userId,
      token,
      expiresAt,
    });

    return {
      token,
      userId,
      orgId,
      inviteCode,
      email: args.email.toLowerCase().trim(),
      name: args.name.trim(),
      role: "admin",
    };
  },
});

// ── 4. VALIDATE SESSION ──
export const validateSession = action({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    try {
      const decoded: any = jwt.verify(args.token, JWT_SECRET);
      const res: any = await ctx.runQuery(api.authInternal.getSessionByToken, {
        token: args.token,
      });

      if (!res || !res.user || (!res.user.isActive && !isSuperAdminUser(res.user))) {
        return null;
      }

      if (res.organization && !isSuperAdminUser(res.user)) {
        const isOrgSuspended =
          res.organization.isActive === false ||
          (res.organization.subscriptionStatus || "").toUpperCase() === "CANCELED";
        if (isOrgSuspended) {
          return null;
        }
      }

      return {
        id: res.user._id,
        _id: res.user._id,
        email: res.user.email,
        name: res.user.name,
        role: res.user.role,
        plan: res.organization?.plan || "starter",
        orgId: res.user.orgId,
        imageUrl: res.user.imageUrl,
        isActive: res.user.isActive,
      };
    } catch (err) {
      return null;
    }
  },
});

// ── 5. LOGOUT USER ──
export const logoutUser = action({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.authInternal.deleteSessionRecord, {
      token: args.token,
    });
    return { success: true };
  },
});
