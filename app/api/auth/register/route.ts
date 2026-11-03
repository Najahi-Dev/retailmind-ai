import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getClientIp, getConvexServerClient, serverSecret } from "@/lib/server/request";
import { errorResponse, readJson, rejectCrossOrigin, str, userAgentOf } from "../_shared";

/** Self sign-up: creates a `pending` account that an administrator must approve. */
export async function POST(req: Request) {
  const blocked = rejectCrossOrigin(req);
  if (blocked) return blocked;

  const body = await readJson(req);
  const email = str(body?.email, 254);
  const password = str(body?.password, 128);
  const name = str(body?.name, 120);
  const phone = body?.phone ? (str(body.phone, 40) ?? undefined) : undefined;
  if (!email || !password || !name) {
    return NextResponse.json({ error: "Name, email and password are required." }, { status: 400 });
  }

  try {
    const result = await getConvexServerClient().action(api.auth.registerUser, {
      email,
      password,
      name,
      phone,
      serverSecret: serverSecret(),
      ip: getClientIp(req),
      userAgent: userAgentOf(req),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return errorResponse(err, "Registration failed.");
  }
}
