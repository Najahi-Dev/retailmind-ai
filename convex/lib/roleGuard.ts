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

export async function requireCallerOrg(
  ctx: GenericMutationCtx<any> | GenericQueryCtx<any>,
  token?: string,
  allowedRoles?: string[]
) {
  const user = await requireRole(ctx, token, allowedRoles);
  
  let orgId = user.orgId;
  let organization = orgId ? await ctx.db.get(orgId) : null;

  if (!organization) {
    // Default workspace fallback
    const defaultOrg = await ctx.db.query("organizations").first();
    if (defaultOrg) {
      orgId = defaultOrg._id;
      organization = defaultOrg;
    } else {
      throw new Error("Unauthorized: User is not assigned to an active organization.");
    }
  }

  if (organization && !organization.isActive) {
    throw new Error("Forbidden: Active organization membership required.");
  }

  return { user, orgId, organization };
}

export function verifyEntityOrgAccess(entity: any, callerOrgId?: string) {
  if (!entity) return;
  if (!callerOrgId) return;
  if (entity.orgId && entity.orgId !== callerOrgId) {
    throw new Error("Access Denied: Resource belongs to another organization.");
  }
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

export async function requireWorkspacePlan(
  ctx: GenericMutationCtx<any> | GenericQueryCtx<any>,
  token?: string,
  minPlanTier: "GROWTH" | "ENTERPRISE" = "GROWTH",
  allowedRoles?: string[],
  featureName?: string
) {
  const { user, orgId, organization } = await requireCallerOrg(ctx, token, allowedRoles);

  const rawStatus = (organization.subscriptionStatus || "FREE").toUpperCase();
  const isPaidActive = ["ACTIVE", "TRIALING", "TRIAL"].includes(rawStatus);
  const tier = (organization.planTier || (organization.plan ? organization.plan.toUpperCase() : "STARTER")) as string;

  const meetsTier = minPlanTier === "GROWTH"
    ? (tier === "GROWTH" || tier === "ENTERPRISE")
    : tier === "ENTERPRISE";

  if (!meetsTier || !isPaidActive) {
    throw new Error(
      `Forbidden: ${featureName || "This feature"} requires an active ${minPlanTier} workspace plan. Please contact your Workspace Administrator to upgrade.`
    );
  }

  return { user, orgId, organization };
}

