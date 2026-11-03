// convex/lib/roleGuard.ts
// Central authentication / authorization helpers.
//
// Every public query/mutation that touches tenant data MUST call one of:
//   requireRole / requireCallerOrg / requireWorkspacePlan / requireSuperAdmin
// and MUST verify fetched documents with `verifyEntityOrgAccess` (or `getOrgEntity`).
//
// The `token` argument is a short-lived HS256 access JWT (see ./jwt.ts). It is
// accepted only if its signature is valid, it has not expired, and the session it
// references still exists and has not been revoked. Revoking a session therefore
// invalidates its access tokens immediately.
import { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { ConvexError } from "convex/values";
import { verifyAccessToken } from "./jwt";

type AnyCtx = GenericMutationCtx<any> | GenericQueryCtx<any>;

export type Role = "super_admin" | "admin" | "manager" | "staff" | "supplier" | "pending";

/** Super admin is determined by the stored role ONLY (never by email address). */
export function isSuperAdminUser(user: { role?: string } | null | undefined): boolean {
  return !!user && user.role === "super_admin";
}

function isOrgSuspended(org: any): boolean {
  return (
    org.isActive === false ||
    (org.subscriptionStatus || "").toUpperCase() === "CANCELED"
  );
}

/**
 * Resolves the caller from an access token. Returns the user document with an
 * extra `_session` field, or null when the token is missing/invalid/expired/revoked.
 */
export async function getCallerUser(ctx: AnyCtx, token?: string) {
  if (!token) return null;

  const claims = await verifyAccessToken(token);
  if (!claims) return null;

  const sessionId = ctx.db.normalizeId("sessions", claims.sid);
  if (!sessionId) return null;
  const session = await ctx.db.get(sessionId);
  if (!session || session.revokedAt || session.expiresAt < Date.now()) return null;
  if (session.userId !== claims.sub) return null;

  const user = await ctx.db.get(session.userId);
  if (!user || !user.isActive || user.role === "pending") return null;

  // Tokens issued before a password change are invalid.
  if (user.passwordChangedAt && claims.iat * 1000 < user.passwordChangedAt - 1000) return null;

  if (user.orgId && !isSuperAdminUser(user)) {
    const org = await ctx.db.get(user.orgId);
    if (!org || isOrgSuspended(org)) return null;
  }

  return { ...user, _session: session } as typeof user & { _session: typeof session };
}

export async function requireRole(ctx: AnyCtx, token?: string, allowedRoles?: string[]) {
  const user = await getCallerUser(ctx, token);
  if (!user) {
    throw new ConvexError("Unauthorized: Invalid session or account deactivated");
  }
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw new ConvexError(`Access denied: Required role in [${allowedRoles.join(", ")}]`);
  }
  return user;
}

export async function requireSuperAdmin(ctx: AnyCtx, token?: string) {
  const user = await getCallerUser(ctx, token);
  if (!user) throw new ConvexError("Unauthorized: Invalid session");
  if (!isSuperAdminUser(user)) {
    throw new ConvexError("Access denied: Super administrator privileges required");
  }
  // An impersonation session must never carry super-admin power.
  if (user._session.impersonatedBy) {
    throw new ConvexError("Access denied: Not available while impersonating");
  }
  return user;
}

/**
 * Requires an authenticated user that belongs to an active organization.
 * There is NO fallback organization: users without an org are rejected.
 */
export async function requireCallerOrg(ctx: AnyCtx, token?: string, allowedRoles?: string[]) {
  const user = await requireRole(ctx, token, allowedRoles);

  if (!user.orgId) {
    throw new ConvexError("Unauthorized: User is not assigned to an active organization.");
  }
  const organization = await ctx.db.get(user.orgId);
  if (!organization) {
    throw new ConvexError("Unauthorized: User is not assigned to an active organization.");
  }
  if (!isSuperAdminUser(user) && isOrgSuspended(organization)) {
    throw new ConvexError(
      "Forbidden: Organization account is suspended or canceled. Contact Administrator.",
    );
  }

  return { user, orgId: user.orgId, organization };
}

/**
 * Throws unless `entity` belongs to `callerOrgId`. Documents without an orgId and
 * calls without a caller org are rejected (fail closed). A null entity is a no-op
 * so callers can produce their own "not found" error.
 */
export function verifyEntityOrgAccess(entity: any, callerOrgId?: string) {
  if (!entity) return;
  if (!callerOrgId || !entity.orgId || entity.orgId !== callerOrgId) {
    throw new ConvexError("Access Denied: Resource belongs to another organization.");
  }
}

/** Fetches a document by (possibly untrusted) id and enforces org ownership. */
export async function getOrgEntity<T = any>(
  ctx: AnyCtx,
  table: string,
  id: string,
  callerOrgId: string,
): Promise<T> {
  const normalized = ctx.db.normalizeId(table as any, id);
  const doc = normalized ? await ctx.db.get(normalized) : null;
  if (!doc) throw new ConvexError(`Not found: ${table}`);
  verifyEntityOrgAccess(doc, callerOrgId);
  return doc as T;
}

/**
 * Returns the supplier record linked to a supplier-role user. Only an explicit
 * `supplierId` link or an exact e-mail match inside the user's own organization
 * is accepted — never a name match or a "first supplier" fallback.
 */
export async function getSupplierForUser(ctx: AnyCtx, user: any) {
  if (!user || !user.orgId) return null;

  if (user.supplierId) {
    const supplier = await ctx.db.get(user.supplierId);
    if (supplier && supplier.orgId === user.orgId) return supplier;
    return null;
  }

  if (user.email) {
    const cleanEmail = user.email.toLowerCase().trim();
    const orgSuppliers = await ctx.db
      .query("suppliers")
      .withIndex("by_org", (q: any) => q.eq("orgId", user.orgId))
      .collect();
    return (
      orgSuppliers.find((s: any) => s.email && s.email.toLowerCase().trim() === cleanEmail) ?? null
    );
  }

  return null;
}

/** Removes secrets from a user document before returning it to a client. */
export function sanitizeUser<T extends Record<string, any> | null | undefined>(user: T) {
  if (!user) return user;
  const {
    passwordHash: _ph,
    failedLoginCount: _f,
    lockedUntil: _l,
    _session: _s,
    clerkId: _c,
    ...safe
  } = user as any;
  return safe as Omit<NonNullable<T>, "passwordHash" | "_session">;
}

export async function requireWorkspacePlan(
  ctx: AnyCtx,
  token?: string,
  minPlanTier: "GROWTH" | "ENTERPRISE" = "GROWTH",
  allowedRoles?: string[],
  featureName?: string,
) {
  const { user, orgId, organization } = await requireCallerOrg(ctx, token, allowedRoles);

  const rawStatus = (organization.subscriptionStatus || "FREE").toUpperCase();
  const isPaidActive = ["ACTIVE", "TRIALING", "TRIAL"].includes(rawStatus);
  const tier = (organization.planTier ||
    (organization.plan ? organization.plan.toUpperCase() : "STARTER")) as string;

  const meetsTier =
    minPlanTier === "GROWTH" ? tier === "GROWTH" || tier === "ENTERPRISE" : tier === "ENTERPRISE";

  if (!meetsTier || !isPaidActive) {
    throw new ConvexError(
      `Forbidden: ${featureName || "This feature"} requires an active ${minPlanTier} workspace plan. Please contact your Workspace Administrator to upgrade.`,
    );
  }

  return { user, orgId, organization };
}
