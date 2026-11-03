// lib/server/auth-cookies.ts
import type { NextResponse } from "next/server";

export const ACCESS_COOKIE = "retailmind_token";
export const REFRESH_COOKIE = "retailmind_refresh";

const secure = process.env.NODE_ENV === "production";

export type TokenBundle = {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string | null;
  refreshTokenExpiresAt: number;
};

/**
 * Access token cookie: readable by the client JS (it is also held in memory and
 * sent to Convex as an argument) but short-lived (15 min).
 * Refresh token cookie: HttpOnly, never visible to JavaScript.
 */
export function setAuthCookies(res: NextResponse, t: TokenBundle) {
  const now = Date.now();
  res.cookies.set(ACCESS_COOKIE, t.accessToken, {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, Math.floor((t.accessTokenExpiresAt - now) / 1000)),
  });
  if (t.refreshToken) {
    res.cookies.set(REFRESH_COOKIE, t.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(0, Math.floor((t.refreshTokenExpiresAt - now) / 1000)),
    });
  }
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, secure, sameSite: "lax" });
}
