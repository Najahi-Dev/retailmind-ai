// proxy.ts (Next.js 16 replacement for middleware.ts; runs on the Node.js runtime)
//
// Page-level gate. Real authorization happens in Convex functions and API route
// handlers; this layer gives fast redirects and server-side role gating for pages.
//  1. Verifies the access JWT signature/expiry (never just "cookie exists").
//  2. If the access token is missing/expired but a refresh cookie exists, rotates
//     the session transparently and forwards the new access token downstream.
//  3. Blocks /super-admin for non-super-admins on the server.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/convex/lib/jwt";
import { api } from "@/convex/_generated/api";
import { ACCESS_COOKIE, REFRESH_COOKIE, setAuthCookies, clearAuthCookies } from "@/lib/server/auth-cookies";
import { getClientIp, getConvexServerClient, serverSecret } from "@/lib/server/request";

const PUBLIC_PAGE_PREFIXES = ["/sign-in", "/create-workspace", "/select-plan", "/docs"];

function isPublicPage(pathname: string) {
  return pathname === "/" || PUBLIC_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function redirectToSignIn(req: NextRequest) {
  const url = new URL("/sign-in", req.url);
  if (req.nextUrl.pathname !== "/") url.searchParams.set("next", req.nextUrl.pathname);
  const res = NextResponse.redirect(url);
  clearAuthCookies(res);
  return res;
}

function gateRole(req: NextRequest, role: string | undefined): NextResponse | null {
  if (req.nextUrl.pathname.startsWith("/super-admin") && role !== "super_admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return null;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API routes authenticate themselves (Stripe webhooks, cron secrets, tokens).
  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (isPublicPage(pathname)) return NextResponse.next();

  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const claims = accessToken ? await verifyAccessToken(accessToken).catch(() => null) : null;
  if (claims) {
    return gateRole(req, claims.role) ?? NextResponse.next();
  }

  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return redirectToSignIn(req);

  try {
    const result = await getConvexServerClient().action(api.auth.refreshSession, {
      refreshToken,
      serverSecret: serverSecret(),
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent")?.slice(0, 256) ?? undefined,
    });
    if (!result) return redirectToSignIn(req);

    const gated = gateRole(req, result.user.role);
    if (gated) {
      setAuthCookies(gated, result);
      return gated;
    }

    // Forward the fresh access token to server components in this same request.
    const headers = new Headers(req.headers);
    const others = req.cookies
      .getAll()
      .filter((c) => c.name !== ACCESS_COOKIE && c.name !== REFRESH_COOKIE)
      .map((c) => `${c.name}=${c.value}`);
    others.push(`${ACCESS_COOKIE}=${result.accessToken}`);
    headers.set("cookie", others.join("; "));

    const res = NextResponse.next({ request: { headers } });
    setAuthCookies(res, result);
    return res;
  } catch (err) {
    console.error("proxy: session refresh failed", err);
    return redirectToSignIn(req);
  }
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
