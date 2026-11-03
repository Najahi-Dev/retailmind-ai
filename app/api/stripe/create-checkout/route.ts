import { createCheckoutSession } from "../../_lib/stripe-sessions";

// Legacy endpoint kept for existing clients. Same implementation as
// /api/billing/create-checkout-session: only a plan name is accepted.
export async function POST(req: Request) {
  return createCheckoutSession(req, {
    successPath: "/dashboard?subscription=success",
    cancelPath: "/#pricing",
    unauthenticatedRedirect: "/sign-in",
  });
}
