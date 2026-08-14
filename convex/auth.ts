"use node";
// convex/auth.ts
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

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

    if (!user) {
      const cleanEmail = args.email.toLowerCase().trim();
      // Auto-create default admin account or dev account if logging in for the first time
      if (cleanEmail === "admin@retailmind.com" || cleanEmail === "devnaja.arcade@gmail.com") {
        const passwordHash = bcrypt.hashSync(args.password, 10);
        const role = cleanEmail === "admin@retailmind.com" ? "admin" : "admin";
        const name = cleanEmail === "admin@retailmind.com" ? "Admin User" : "Dev Naja";
        
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
        throw new Error("Invalid email or password. Click 'Create Account' to register.");
      }
    }

    if (user.isActive === false) {
      throw new Error("Account suspended. Please contact administrator.");
    }

    if (!user.passwordHash) {
      // Auto-set password to admin123 if user was imported without passwordHash
      const defaultHash = bcrypt.hashSync(args.password, 10);
      await ctx.runMutation(api.authInternal.updateUserPassword, {
        userId: user._id,
        passwordHash: defaultHash,
      });
      user.passwordHash = defaultHash;
    }

    const isValidPassword = bcrypt.compareSync(args.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error("Invalid email or password");
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
    role: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim();
    const role = args.role || "staff";

    const passwordHash = bcrypt.hashSync(args.password, 10);

    const userId: any = await ctx.runMutation(api.authInternal.createUserRecord, {
      email,
      passwordHash,
      name: args.name,
      role,
      imageUrl: args.imageUrl,
    });

    const expiresAt = Date.now() + SESSION_DURATION;
    const token = jwt.sign(
      {
        userId,
        email,
        name: args.name,
        role,
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
      email,
      name: args.name,
      role,
      imageUrl: args.imageUrl,
    };
  },
});

// ── 3. VALIDATE SESSION ──
export const validateSession = action({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    try {
      const decoded: any = jwt.verify(args.token, JWT_SECRET);
      const res: any = await ctx.runQuery(api.authInternal.getSessionByToken, {
        token: args.token,
      });

      if (!res || !res.user || res.user.isActive === false) {
        return null;
      }

      return {
        id: res.user._id,
        _id: res.user._id,
        email: res.user.email,
        name: res.user.name,
        role: res.user.role,
        plan: res.user.plan,
        imageUrl: res.user.imageUrl,
        isActive: res.user.isActive,
      };
    } catch (err) {
      return null;
    }
  },
});

// ── 4. LOGOUT USER ──
export const logoutUser = action({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.authInternal.deleteSessionRecord, {
      token: args.token,
    });
    return { success: true };
  },
});

// ── 5. CHANGE PASSWORD ──
export const changePassword = action({
  args: {
    token: v.string(),
    oldPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const res: any = await ctx.runQuery(api.authInternal.getSessionByToken, {
      token: args.token,
    });

    if (!res || !res.user) {
      throw new Error("Unauthorized");
    }

    if (!res.user.passwordHash) {
      throw new Error("Invalid current password");
    }

    const isValidPassword = bcrypt.compareSync(args.oldPassword, res.user.passwordHash);
    if (!isValidPassword) {
      throw new Error("Current password is incorrect");
    }

    const newPasswordHash = bcrypt.hashSync(args.newPassword, 10);
    await ctx.runMutation(api.authInternal.updateUserPassword, {
      userId: res.user._id,
      passwordHash: newPasswordHash,
    });

    return { success: true };
  },
});

// ── 6. SEED / REPAIR ALL USER PASSWORDS ──
export const seedAllUserPasswords = action({
  args: { defaultPassword: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const defaultPassword = args.defaultPassword || "admin123";
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    const users: any[] = await ctx.runQuery(api.authInternal.getAllUsers, {});
    let updatedCount = 0;

    for (const u of users) {
      if (!u.passwordHash) {
        await ctx.runMutation(api.authInternal.updateUserPassword, {
          userId: u._id,
          passwordHash,
        });
        updatedCount++;
      }
    }

    return {
      success: true,
      message: `Updated ${updatedCount} users with default password '${defaultPassword}'`,
      totalUsers: users.length,
    };
  },
});
