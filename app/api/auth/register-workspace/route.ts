import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getClientIp, getConvexServerClient, serverSecret } from "@/lib/server/request";
import { errorResponse, readJson, rejectCrossOrigin, sessionResponse, str, userAgentOf } from "../_shared";

export async function POST(req: Request) {
  const blocked = rejectCrossOrigin(req);
  if (blocked) return blocked;

  const body = await readJson(req);
  const companyName = str(body?.companyName, 120);
  const slug = str(body?.slug, 48);
  const name = str(body?.name, 120);
  const email = str(body?.email, 254);
  const password = str(body?.password, 128);
  const phone = body?.phone ? (str(body.phone, 40) ?? undefined) : undefined;
  if (!companyName || !slug || !name || !email || !password) {
    return NextResponse.json({ error: "All required fields must be provided." }, { status: 400 });
  }

  try {
    const result = await getConvexServerClient().action(api.auth.registerWorkspaceAndOwner, {
      companyName,
      slug,
      name,
      email,
      phone,
      password,
      serverSecret: serverSecret(),
      ip: getClientIp(req),
      userAgent: userAgentOf(req),
    });
    return sessionResponse(result, { orgId: result.orgId, inviteCode: result.inviteCode });
  } catch (err) {
    return errorResponse(err, "Failed to create workspace.");
  }
}
