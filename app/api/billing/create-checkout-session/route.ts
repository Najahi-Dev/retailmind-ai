import { createCheckoutSession } from "../../_lib/stripe-sessions";

// Body: { plan?: "starter" | "growth" } — the price ID and plan tier are resolved
// server-side; the organization comes from the verified caller.
export async function POST(req: Request) {
  return createCheckoutSession(req, {
    successPath: "/dashboard?billing=success",
    cancelPath: "/select-plan?billing=cancelled",
  });
}
