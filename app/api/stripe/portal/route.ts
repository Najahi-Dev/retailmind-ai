import { createPortalSession } from "../../_lib/stripe-sessions";

// Legacy endpoint: uses the organization's Stripe customer (never a customer
// searched by e-mail / user id).
export async function POST(req: Request) {
  return createPortalSession(req, "/settings/billing");
}
