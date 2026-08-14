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
    return null;
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

export async function getSupplierForUser(
  ctx: GenericMutationCtx<any> | GenericQueryCtx<any>,
  user: any
) {
  if (!user) return null;

  // 1. Check direct supplierId link on user record
  if (user.supplierId) {
    const supplier = await ctx.db.get(user.supplierId);
    if (supplier) return supplier;
  }

  // 2. Lookup supplier by email
  if (user.email) {
    const cleanEmail = user.email.toLowerCase().trim();
    const allSuppliers = await ctx.db.query("suppliers").collect();
    const supplierByEmail = allSuppliers.find(
      (s) => s.email && s.email.toLowerCase().trim() === cleanEmail
    );
    if (supplierByEmail) return supplierByEmail;
  }

  // 3. Lookup supplier by name
  if (user.name) {
    const cleanName = user.name.toLowerCase().trim();
    const allSuppliers = await ctx.db.query("suppliers").collect();
    const supplierByName = allSuppliers.find(
      (s) => s.name && s.name.toLowerCase().trim() === cleanName
    );
    if (supplierByName) return supplierByName;
  }

  // 4. Default fallback for supplier role
  if (user.role === "supplier") {
    const firstSupplier = await ctx.db.query("suppliers").first();
    return firstSupplier;
  }

  return null;
}
