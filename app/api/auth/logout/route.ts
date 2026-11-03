import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient, serverSecret } from "@/lib/server/request";
import { REFRESH_COOKIE, clearAuthCookies } from "@/lib/server/auth-cookies";
import { rejectCrossOrigin } from "../_shared";

export async function POST(req: Request) {
  const blocked = rejectCrossOrigin(req);
  if (blocked) return blocked;

  const refreshToken = (await cookies()).get(REFRESH_COOKIE)?.value;
  try {
    await getConvexServerClient().action(api.auth.logoutUser, {
      refreshToken,
      serverSecret: serverSecret(),
    });
  } catch (err) {
    console.error("logout: session revoke failed", err);
  }
  const res = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  clearAuthCookies(res);
  return res;
}
