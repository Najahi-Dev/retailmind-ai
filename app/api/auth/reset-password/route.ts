import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getClientIp, getConvexServerClient, serverSecret } from "@/lib/server/request";
import { clearAuthCookies } from "@/lib/server/auth-cookies";
import { errorResponse, readJson, rejectCrossOrigin, str, userAgentOf } from "../_shared";

/**
 * { token }               -> checks whether the link is still valid
 * { token, newPassword }  -> sets the new password (single use) and revokes all sessions
 */
export async function POST(req: Request) {
  const blocked = rejectCrossOrigin(req);
  if (blocked) return blocked;

  const body = await readJson(req);
  const token = str(body?.token, 128);
  const newPassword = body?.newPassword === undefined ? undefined : str(body.newPassword, 128);
  if (!token) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const client = getConvexServerClient();
  const meta = { serverSecret: serverSecret(), ip: getClientIp(req), userAgent: userAgentOf(req) };

  try {
    if (newPassword === undefined) {
      const { valid } = await client.action(api.auth.checkPasswordResetToken, { token, ...meta });
      return NextResponse.json({ valid }, { headers: { "Cache-Control": "no-store" } });
    }
    if (!newPassword) {
      return NextResponse.json({ error: "Please enter a new password." }, { status: 400 });
    }
    await client.action(api.auth.resetPassword, { token, newPassword, ...meta });
    // Any session in this browser was revoked server-side; clear its cookies too.
    const res = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    clearAuthCookies(res);
    return res;
  } catch (err) {
    return errorResponse(err, "Could not reset the password. Please try again.");
  }
}
