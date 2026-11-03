import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getClientIp, getConvexServerClient, serverSecret } from "@/lib/server/request";
import { errorResponse, readJson, rejectCrossOrigin, str, userAgentOf } from "../_shared";

const GENERIC_OK =
  "If an account exists for that e-mail, we've sent a link to reset your password. It expires in 30 minutes.";

/** Always returns the same response whether or not the account exists. */
export async function POST(req: Request) {
  const blocked = rejectCrossOrigin(req);
  if (blocked) return blocked;

  const body = await readJson(req);
  const email = str(body?.email, 254)?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid e-mail address." }, { status: 400 });
  }

  try {
    await getConvexServerClient().action(api.auth.requestPasswordReset, {
      email,
      serverSecret: serverSecret(),
      ip: getClientIp(req),
      userAgent: userAgentOf(req),
    });
    return NextResponse.json({ message: GENERIC_OK }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err, "Could not process the request. Please try again.");
  }
}
