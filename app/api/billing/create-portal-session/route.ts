import { createPortalSession } from "../../_lib/stripe-sessions";

export async function POST(req: Request) {
  return createPortalSession(req, "/settings/billing");
}
