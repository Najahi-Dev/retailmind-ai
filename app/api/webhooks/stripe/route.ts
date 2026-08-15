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
      // 1. Checkout Session Completed (User completed Stripe checkout & payment)
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = (session.client_reference_id || session.metadata?.organization_id) as any;
        const userId = session.metadata?.userId;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        await convex.mutation(api.organizations.updateSubscriptionFromStripeInternal, {
          orgId: orgId || undefined,
          stripeCustomerId: customerId || undefined,
          stripeSubscriptionId: subscriptionId || undefined,
          userId: userId || undefined,
          planTier: "GROWTH",
          subscriptionStatus: "ACTIVE",
        });
        break;
      }

      // 2. Subscription Created or Updated
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.organization_id as any;
        const userId = subscription.metadata?.userId;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

        const rawStatus = subscription.status; // trialing, active, past_due, canceled, unpaid
        let status: "FREE" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" = "ACTIVE";

        if (rawStatus === "active" || rawStatus === "trialing") status = "ACTIVE";
        else if (rawStatus === "past_due") status = "PAST_DUE";
        else if (rawStatus === "canceled" || rawStatus === "unpaid") status = "CANCELED";

        const priceId = subscription.items.data[0]?.price?.id;
        const trialEndsAt = subscription.trial_end ? subscription.trial_end * 1000 : undefined;
        const subAny = subscription as any;
        const currentPeriodEnd = subAny.current_period_end ? subAny.current_period_end * 1000 : undefined;

        await convex.mutation(api.organizations.updateSubscriptionFromStripeInternal, {
          orgId: orgId || undefined,
          stripeCustomerId: customerId || undefined,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          userId: userId || undefined,
          planTier: "GROWTH",
          subscriptionStatus: status,
          trialEndsAt,
          currentPeriodEnd,
        });
        break;
      }

      // 3. Invoice Payment Succeeded
      case "invoice.payment_succeeded":
      case "invoice.paid": {
        const invoice = event.data.object as any;
        const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

        if (subscriptionId || customerId) {
          await convex.mutation(api.organizations.updateSubscriptionFromStripeInternal, {
            stripeCustomerId: customerId || undefined,
            stripeSubscriptionId: subscriptionId || undefined,
            planTier: "GROWTH",
            subscriptionStatus: "ACTIVE",
          });
        }
        break;
      }

      // 4. Subscription Deleted (Cancelled/Expired)
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.organization_id as any;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

        await convex.mutation(api.organizations.downgradeSubscriptionInternal, {
          orgId: orgId || undefined,
          stripeCustomerId: customerId || undefined,
          stripeSubscriptionId: subscription.id,
        });
        break;
      }

      // 5. Payment Failed
      case "invoice.payment_failed": {
        const invoiceAny = event.data.object as any;
        const subscriptionId = typeof invoiceAny.subscription === "string" ? invoiceAny.subscription : invoiceAny.subscription?.id;
        const customerId = typeof invoiceAny.customer === "string" ? invoiceAny.customer : invoiceAny.customer?.id;

        if (subscriptionId || customerId) {
          let orgId = undefined;
          try {
            if (subscriptionId) {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              orgId = subscription.metadata?.organization_id as any;
            }
          } catch {}

          await convex.mutation(api.organizations.updateSubscriptionFromStripeInternal, {
            orgId: orgId || undefined,
            stripeCustomerId: customerId || undefined,
            stripeSubscriptionId: subscriptionId || undefined,
            planTier: "GROWTH",
            subscriptionStatus: "PAST_DUE",
          });
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
