import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

// TODO: The Convex cron in convex/crons.ts ("nightly-reorder-check", which runs
// internal.reorder.generateReorderSuggestions for all orgs) is the preferred
// trigger. Internal Convex functions cannot be called over HTTP, and the public
// `generateReorderSuggestionsPublic` is token/org-scoped, so this endpoint has
// no safe all-orgs function to call. If an external trigger is ever required,
// add a Convex mutation guarded by AUTH_SERVER_SECRET and call it here.

function safeEqual(a: string, b: string): boolean {
  // Hash first so lengths always match and timing does not leak the length.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const header = req.headers.get("authorization") ?? "";
  return safeEqual(header, `Bearer ${secret}`);
}

async function handle(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    { error: "Not implemented: reorder generation runs via the Convex scheduled cron." },
    { status: 501 },
  );
}

export async function POST(req: Request) {
  return handle(req);
}

// Vercel Cron issues GET requests with `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: Request) {
  return handle(req);
}
