import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getClientIp, getConvexServerClient, serverSecret } from "@/lib/server/request";
import { errorResponse, readJson, rejectCrossOrigin, sessionResponse, str, userAgentOf } from "../_shared";

export async function POST(req: Request) {
  const blocked = rejectCrossOrigin(req);
  if (blocked) return blocked;

  const body = await readJson(req);
  const email = str(body?.email, 254);
  const password = str(body?.password, 128);
  const workspace = body?.workspace ? (str(body.workspace, 48) ?? undefined) : undefined;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const result = await getConvexServerClient().action(api.auth.loginUser, {
      email,
      password,
      workspace,
      serverSecret: serverSecret(),
      ip: getClientIp(req),
      userAgent: userAgentOf(req),
    });
    return sessionResponse(result);
  } catch (err) {
    return errorResponse(err, "Authentication failed. Please try again.");
  }
}
