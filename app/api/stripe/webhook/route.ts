import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_mock";
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock";
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
});

const convex = new ConvexHttpClient(convexUrl);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (stripeWebhookSecret && signature && !stripeWebhookSecret.includes("mock")) {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } else {
      // Direct JSON parsing fallback for mock/local development without CLI signature
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  console.log(`Processing Stripe Webhook Event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clerkId = session.metadata?.clerkId;
        const plan = (session.metadata?.plan as "starter" | "growth" | "enterprise") || "growth";

        if (clerkId && session.subscription) {
          const subscriptionObj: any = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          await convex.mutation(api.subscriptions.upsertSubscription, {
            clerkId,
            stripeCustomerId: (session.customer as string) || "",
            stripeSubscriptionId: subscriptionObj.id,
            plan,
            status: "active",
            currentPeriodStart: (subscriptionObj.current_period_start || Math.floor(Date.now() / 1000)) * 1000,
            currentPeriodEnd: (subscriptionObj.current_period_end || Math.floor(Date.now() / 1000) + 2592000) * 1000,
            cancelAtPeriodEnd: subscriptionObj.cancel_at_period_end || false,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription: any = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const clerkId = (customer as Stripe.Customer).metadata?.clerkId;

        if (clerkId) {
          const statusMap: Record<string, "active" | "cancelled" | "past_due" | "trialing"> = {
            active: "active",
            past_due: "past_due",
            unpaid: "past_due",
            canceled: "cancelled",
            trialing: "trialing",
          };

          const plan = (subscription.metadata?.plan as "starter" | "growth" | "enterprise") || "growth";

          await convex.mutation(api.subscriptions.upsertSubscription, {
            clerkId,
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            plan,
            status: statusMap[subscription.status] || "active",
            currentPeriodStart: (subscription.current_period_start || Math.floor(Date.now() / 1000)) * 1000,
            currentPeriodEnd: (subscription.current_period_end || Math.floor(Date.now() / 1000) + 2592000) * 1000,
            cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription: any = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const clerkId = (customer as Stripe.Customer).metadata?.clerkId;

        if (clerkId) {
          // Downgrade user back to starter plan in Convex
          await convex.mutation(api.subscriptions.updateUserPlan, {
            clerkId,
            plan: "starter",
          });

          await convex.mutation(api.subscriptions.upsertSubscription, {
            clerkId,
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            plan: "starter",
            status: "cancelled",
            currentPeriodStart: (subscription.current_period_start || Math.floor(Date.now() / 1000)) * 1000,
            currentPeriodEnd: (subscription.current_period_end || Math.floor(Date.now() / 1000)) * 1000,
            cancelAtPeriodEnd: true,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice: any = event.data.object;
        const customerId = invoice.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        const clerkId = (customer as Stripe.Customer).metadata?.clerkId;

        if (clerkId && invoice.subscription) {
          await convex.mutation(api.subscriptions.upsertSubscription, {
            clerkId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: invoice.subscription as string,
            plan: "starter",
            status: "past_due",
            currentPeriodStart: Date.now(),
            currentPeriodEnd: Date.now() + 86400000 * 3,
            cancelAtPeriodEnd: false,
          });
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Stripe webhook processing error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}
