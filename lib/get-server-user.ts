// lib/get-server-user.ts
// Server-side identity for Server Components and Route Handlers.
// The access token's HS256 signature, issuer, audience and expiry are VERIFIED.
// For authorization decisions on data, pass the token on to Convex functions
// (getServerAccessToken), which additionally check that the session is not revoked.
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/convex/lib/jwt";
import { ACCESS_COOKIE } from "@/lib/server/auth-cookies";

export interface ServerUser {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "manager" | "staff" | "supplier" | "pending";
  orgId?: string;
  sessionId: string;
  impersonatedBy?: string;
}

export async function getServerAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE)?.value ?? null;
}

export async function getServerUser(): Promise<ServerUser | null> {
  try {
    const token = await getServerAccessToken();
    if (!token) return null;
    const claims = await verifyAccessToken(token);
    if (!claims) return null;
    return {
      id: claims.sub,
      email: claims.email ?? "",
      name: claims.name ?? "",
      role: claims.role as ServerUser["role"],
      orgId: claims.orgId,
      sessionId: claims.sid,
      impersonatedBy: claims.imp,
    };
  } catch {
    return null;
  }
}
