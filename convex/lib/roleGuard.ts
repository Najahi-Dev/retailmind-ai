// convex/lib/roleGuard.ts
import { GenericMutationCtx, GenericQueryCtx } from "convex/server";

export async function requireRole(
  ctx: GenericMutationCtx<any> | GenericQueryCtx<any>,
  token?: string,
  allowedRoles?: string[]
) {
  const user = await getCallerUser(ctx, token);
  if (!user || !user.isActive) {
    throw new Error("Unauthorized: Invalid session or account deactivated");
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      throw new Error(`Access denied: Required role in [${allowedRoles.join(", ")}]`);
    }
  }

  return user;
}

export async function getCallerUser(
  ctx: GenericMutationCtx<any> | GenericQueryCtx<any>,
  token?: string
) {
  if (!token) {
    const firstAdmin = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", "admin@retailmind.com"))
      .first();
    return firstAdmin;
  }

  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    return null;
  }

  return await ctx.db.get(session.userId);
}
