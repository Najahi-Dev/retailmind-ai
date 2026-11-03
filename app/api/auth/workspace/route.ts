import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getClientIp, getConvexServerClient, serverSecret } from "@/lib/server/request";
import { errorResponse, readJson, rejectCrossOrigin, str } from "../_shared";

/**
 * "Find your workspace": verifies a workspace URL / name exists and is active.
 * Rate-limited per IP inside Convex. Returns only the public name/slug/logo.
 */
export async function POST(req: Request) {
  const blocked = rejectCrossOrigin(req);
  if (blocked) return blocked;

  const body = await readJson(req);
  const query = str(body?.query, 120)?.trim();
  if (!query) {
    return NextResponse.json({ error: "Enter your workspace URL or name." }, { status: 400 });
  }

  try {
    const workspace = await getConvexServerClient().mutation(api.workspaces.findWorkspace, {
      query,
      serverSecret: serverSecret(),
      ip: getClientIp(req),
    });
    if (!workspace) {
      return NextResponse.json(
        { error: "We couldn't find an active workspace with that URL or name." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json({ workspace }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err, "Could not look up the workspace.");
  }
}
