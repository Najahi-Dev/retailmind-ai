// app/api/auth/_shared.ts
import { NextResponse } from "next/server";
import { setAuthCookies, clearAuthCookies, TokenBundle } from "@/lib/server/auth-cookies";
import { convexErrorResponse, isSameOrigin } from "@/lib/server/request";

export function rejectCrossOrigin(req: Request): NextResponse | null {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  }
  return null;
}

/** Session payload returned to the browser. The refresh token is NEVER included in the body. */
export function sessionResponse(
  result: TokenBundle & { user: unknown },
  extra: Record<string, unknown> = {},
) {
  const res = NextResponse.json(
    {
      accessToken: result.accessToken,
      accessTokenExpiresAt: result.accessTokenExpiresAt,
      user: result.user,
      ...extra,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
  setAuthCookies(res, result);
  return res;
}

export function errorResponse(err: unknown, fallback: string, clearCookies = false) {
  const { status, message, retryAfterMs } = convexErrorResponse(err, fallback);
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (retryAfterMs) headers["Retry-After"] = String(Math.ceil(retryAfterMs / 1000));
  const res = NextResponse.json(
    retryAfterMs ? { error: message, code: "RATE_LIMITED", retryAfterMs } : { error: message },
    { status, headers },
  );
  if (clearCookies) clearAuthCookies(res);
  return res;
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const str = (v: unknown, max = 256) =>
  typeof v === "string" && v.length <= max ? v : null;

export const userAgentOf = (req: Request) =>
  req.headers.get("user-agent")?.slice(0, 256) ?? undefined;
