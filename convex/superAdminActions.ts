"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import bcrypt from "bcryptjs";
import { validatePasswordStrength } from "./lib/password";

const BCRYPT_ROUNDS = 12;

export const addTenantUser = action({
  args: {
    token: v.string(),
    orgId: v.id("organizations"),
    email: v.string(),
    name: v.string(),
    password: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("staff"),
      v.literal("supplier"),
      v.literal("pending"),
    ),
  },
  handler: async (ctx, args): Promise<{ success: true; userId: Id<"users"> }> => {
    // 1. Verify Super Admin Token (throws if not a super admin)
    await ctx.runQuery(internal.usersAdmin.requireSuperAdminInternal, { token: args.token });

    // 2. Validate + hash password
    validatePasswordStrength(args.password);
    const passwordHash = await bcrypt.hash(args.password, BCRYPT_ROUNDS);

    // 3. Create User Record via Internal Mutation (active by default)
    let userId: Id<"users">;
    try {
      userId = await ctx.runMutation(internal.authInternal.createUserRecord, {
        email: args.email.toLowerCase().trim(),
        passwordHash,
        name: args.name,
        role: args.role,
        orgId: args.orgId,
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error?.data ?? "");
      const cleanMessage = errorMessage.includes("already exists")
        ? "User with this email already exists"
        : "Failed to create user";
      throw new ConvexError(cleanMessage);
    }

    return { success: true, userId };
  },
});
