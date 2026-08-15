import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // Direct JSON parsing fallback for development/local testing
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: any) {
    console.error(`Stripe Webhook Signature Verification Error: ${err?.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err?.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      // 1. Checkout Session Completed
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = (session.client_reference_id || session.metadata?.organization_id) as any;

        if (orgId) {
          const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

          await convex.mutation(api.organizations.updateSubscriptionFromStripeInternal, {
            orgId,
            stripeSubscriptionId: subscriptionId,
            planTier: "GROWTH",
            subscriptionStatus: "TRIALING",
            trialEndsAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
          });
        }
        break;
      }

      // 2. Subscription Created or Updated
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.organization_id as any;

        if (orgId) {
          const rawStatus = subscription.status; // trialing, active, past_due, canceled, unpaid
          let status: "FREE" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" = "ACTIVE";

          if (rawStatus === "trialing") status = "TRIALING";
          else if (rawStatus === "active") status = "ACTIVE";
          else if (rawStatus === "past_due") status = "PAST_DUE";
          else if (rawStatus === "canceled" || rawStatus === "unpaid") status = "CANCELED";

          const priceId = subscription.items.data[0]?.price?.id;
          const trialEndsAt = subscription.trial_end ? subscription.trial_end * 1000 : undefined;
          const subAny = subscription as any;
          const currentPeriodEnd = subAny.current_period_end ? subAny.current_period_end * 1000 : undefined;

          await convex.mutation(api.organizations.updateSubscriptionFromStripeInternal, {
            orgId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            planTier: "GROWTH",
            subscriptionStatus: status,
            trialEndsAt,
            currentPeriodEnd,
          });
        }
        break;
      }

      // 3. Subscription Deleted (Cancelled/Expired)
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.organization_id as any;

        if (orgId) {
          await convex.mutation(api.organizations.downgradeSubscriptionInternal, {
            orgId,
          });
        }
        break;
      }

      // 4. Payment Failed
      case "invoice.payment_failed": {
        const invoiceAny = event.data.object as any;
        const subscriptionId = typeof invoiceAny.subscription === "string" ? invoiceAny.subscription : invoiceAny.subscription?.id;

        if (subscriptionId) {
          // Retrieve subscription to get orgId
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const orgId = subscription.metadata?.organization_id as any;

          if (orgId) {
            await convex.mutation(api.organizations.updateSubscriptionFromStripeInternal, {
              orgId,
              stripeSubscriptionId: subscription.id,
              planTier: "GROWTH",
              subscriptionStatus: "PAST_DUE",
            });
          }
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error(`Stripe Webhook Processing Error: ${err?.message}`);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
