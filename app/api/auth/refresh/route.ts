import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { api } from "@/convex/_generated/api";
import { getClientIp, getConvexServerClient, serverSecret } from "@/lib/server/request";
import { REFRESH_COOKIE, clearAuthCookies } from "@/lib/server/auth-cookies";
import { errorResponse, rejectCrossOrigin, sessionResponse, userAgentOf } from "../_shared";

/** Exchanges the HttpOnly refresh cookie for a new access token and rotates the refresh token. */
export async function POST(req: Request) {
  const blocked = rejectCrossOrigin(req);
  if (blocked) return blocked;

  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    const res = NextResponse.json({ error: "No session" }, { status: 401 });
    clearAuthCookies(res);
    return res;
  }

  try {
    const result = await getConvexServerClient().action(api.auth.refreshSession, {
      refreshToken,
      serverSecret: serverSecret(),
      ip: getClientIp(req),
      userAgent: userAgentOf(req),
    });
    if (!result) {
      const res = NextResponse.json({ error: "Session expired" }, { status: 401 });
      clearAuthCookies(res);
      return res;
    }
    return sessionResponse(result);
  } catch (err) {
    return errorResponse(err, "Could not refresh session");
  }
}
