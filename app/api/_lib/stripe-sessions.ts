// app/api/_lib/stripe-sessions.ts
// Single implementation of checkout / billing-portal session creation, shared by
// /api/billing/* and /api/stripe/* (legacy) routes.
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { stripe } from "@/lib/stripe";
import { getConvexServerClient, serverSecret, convexErrorResponse } from "@/lib/server/request";
import { jsonError, readJson, requireCaller } from "./guard";
import { appOrigin, checkoutPlanSchema, planTierForPlan, priceIdForPlan } from "./billing";

/** Verifies the caller and loads their org via Convex; requires org admin. */
async function requireOrgAdmin(req: Request) {
  const auth = await requireCaller(req);
  if ("response" in auth) return auth;
  const client = getConvexServerClient();
  const org = await client.query(api.organizations.getCurrentOrganization, { token: auth.token });
  if (!org) return { response: jsonError(404, "Organization not found.") };
  if (org.userRole !== "admin") {
    return { response: jsonError(403, "Only workspace admins can manage billing.") };
  }
  return { ...auth, org, client };
}

export async function createCheckoutSession(
  req: Request,
  opts: { cancelPath: string; successPath: string; unauthenticatedRedirect?: string },
): Promise<NextResponse> {
  try {
    const auth = await requireOrgAdmin(req);
    if ("response" in auth) {
      if (opts.unauthenticatedRedirect && auth.response.status === 401) {
        return NextResponse.json({ redirectUrl: opts.unauthenticatedRedirect }, { status: 401 });
      }
      return auth.response;
    }
    const { org, client } = auth;

    const body = (await readJson(req)) as { plan?: unknown } | undefined;
    const parsed = checkoutPlanSchema.safeParse(body?.plan ?? "growth");
    if (!parsed.success) return jsonError(400, "Invalid plan.");
    const plan = parsed.data;

    const priceId = priceIdForPlan(plan);
    if (!priceId) {
      console.error(`Stripe price ID for plan "${plan}" is not configured.`);
      return jsonError(503, "Billing is not configured for this plan.");
    }
    const planTier = planTierForPlan(plan);

    let stripeCustomerId = org.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { organization_id: org._id },
      });
      stripeCustomerId = customer.id;
      await client.mutation(api.organizations.updateStripeCustomerIdInternal, {
        serverSecret: serverSecret(),
        orgId: org._id,
        stripeCustomerId: customer.id,
      });
    }

    const origin = appOrigin(req);
    const metadata = { organization_id: org._id, plan_tier: planTier };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata },
      metadata,
      client_reference_id: org._id,
      success_url: `${origin}${opts.successPath}`,
      cancel_url: `${origin}${opts.cancelPath}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const { status, message } = convexErrorResponse(err, "Failed to create checkout session.");
    return jsonError(status, message);
  }
}

export async function createPortalSession(req: Request, returnPath: string): Promise<NextResponse> {
  try {
    const auth = await requireOrgAdmin(req);
    if ("response" in auth) return auth.response;
    const { org } = auth;

    if (!org.stripeCustomerId) {
      return jsonError(400, "No Stripe customer is associated with this workspace.");
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${appOrigin(req)}${returnPath}`,
    });
    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    const { status, message } = convexErrorResponse(err, "Failed to create portal session.");
    return jsonError(status, message);
  }
}

export { requireOrgAdmin };
