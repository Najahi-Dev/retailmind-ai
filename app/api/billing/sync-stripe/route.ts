import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { api } from "@/convex/_generated/api";
import { stripe } from "@/lib/stripe";
import { convexErrorResponse, serverSecret } from "@/lib/server/request";
import { requireOrgAdmin } from "../../_lib/stripe-sessions";
import { jsonError } from "../../_lib/guard";
import { planTierFromPriceId } from "../../_lib/billing";

export async function POST(req: Request) {
  try {
    const auth = await requireOrgAdmin(req);
    if ("response" in auth) return auth.response;
    const { org, client } = auth;

    const findActive = async (customer: string) => {
      const subs = await stripe.subscriptions.list({ customer, status: "all", limit: 5 });
      return subs.data.find((s) => s.status === "active" || s.status === "trialing") ?? null;
    };

    let stripeCustomerId: string | undefined = org.stripeCustomerId ?? undefined;
    let activeSubscription: Stripe.Subscription | null = null;

    if (stripeCustomerId) {
      activeSubscription = await findActive(stripeCustomerId).catch(() => null);
    }

    if (!activeSubscription) {
      // org._id is a Convex id (alphanumeric) — safe inside the search query.
      const orgId = String(org._id).replace(/[^A-Za-z0-9_]/g, "");
      const customerSearch = await stripe.customers
        .search({ query: `metadata['organization_id']:'${orgId}'` })
        .catch(() => null);
      const found = customerSearch?.data[0];
      if (found) {
        stripeCustomerId = found.id;
        activeSubscription = await findActive(found.id).catch(() => null);
      }
    }

    if (!activeSubscription) {
      return jsonError(400, "No active subscription found in Stripe to synchronize.");
    }

    const priceId = activeSubscription.items.data[0]?.price?.id;
    const planTier = planTierFromPriceId(priceId);
    if (!planTier) {
      console.warn("sync-stripe: subscription price is not a known plan price", {
        subscriptionId: activeSubscription.id,
      });
      return jsonError(400, "Subscription price does not match a known plan.");
    }

    const periodEnd = (activeSubscription as unknown as { current_period_end?: number })
      .current_period_end;

    await client.mutation(api.organizations.updateSubscriptionFromStripeInternal, {
      serverSecret: serverSecret(),
      orgId: org._id,
      stripeCustomerId,
      stripeSubscriptionId: activeSubscription.id,
      stripePriceId: priceId,
      planTier,
      subscriptionStatus: "ACTIVE",
      currentPeriodEnd: periodEnd ? periodEnd * 1000 : undefined,
    });

    return NextResponse.json({
      success: true,
      planTier,
      subscriptionStatus: "ACTIVE",
      message: "Stripe subscription synchronized successfully!",
    });
  } catch (err) {
    const { status, message } = convexErrorResponse(err, "Failed to synchronize Stripe status.");
    return jsonError(status, message);
  }
}
