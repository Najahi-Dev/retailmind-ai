"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import bcrypt from "bcryptjs";

export const addTenantUser = action({
  args: {
    token: v.string(),
    orgId: v.id("organizations"),
    email: v.string(),
    name: v.string(),
    password: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    // 1. Verify Super Admin Token
    const admin: any = await ctx.runQuery(api.usersAdmin.verifySuperAdminToken, {
      token: args.token,
    });

    if (!admin) {
      throw new ConvexError("Unauthorized: Super Admin access required");
    }

    // 2. Hash Password
    const passwordHash = bcrypt.hashSync(args.password, 10);

    // 3. Create User Record via Internal Mutation
    let userId: any;
    try {
      userId = await ctx.runMutation(api.authInternal.createUserRecord, {
        email: args.email.toLowerCase().trim(),
        passwordHash,
        name: args.name,
        role: args.role as any,
        orgId: args.orgId,
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create user";
      const cleanMessage = errorMessage.includes("already exists") 
        ? "User with this email already exists" 
        : "Failed to create user";
      throw new ConvexError(cleanMessage);
    }

    // 4. Activate User Immediately (since Super Admin created them)
    await ctx.runMutation(api.authInternal.updateUserStatus, {
      userId,
      isActive: true,
    });

    return { success: true, userId };
  },
});
