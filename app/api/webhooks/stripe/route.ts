import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { stripe } from "@/lib/stripe";
import { getConvexServerClient, serverSecret } from "@/lib/server/request";
import { planTierFromPriceId, type PlanTier } from "../../_lib/billing";

// Single Stripe webhook handler (also exposed at /api/stripe/webhook).
// Every event MUST carry a valid `stripe-signature` over the raw body.

type SubStatus = "FREE" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";

function idOf(v: string | { id: string } | null | undefined): string | undefined {
  if (!v) return undefined;
  return typeof v === "string" ? v : v.id;
}

/** organization_id metadata is written by our own checkout code (and the event is signed). */
function orgIdFrom(meta: Stripe.Metadata | null | undefined, fallback?: string | null) {
  const raw = fallback || meta?.organization_id;
  return raw && /^[A-Za-z0-9_]+$/.test(raw) ? (raw as Id<"organizations">) : undefined;
}

function priceIdOf(sub: Stripe.Subscription): string | undefined {
  return sub.items.data[0]?.price?.id;
}

function mapStatus(raw: Stripe.Subscription.Status): SubStatus {
  if (raw === "active" || raw === "trialing") return "ACTIVE";
  if (raw === "past_due") return "PAST_DUE";
  if (raw === "canceled" || raw === "unpaid" || raw === "incomplete_expired") return "CANCELED";
  return "PAST_DUE"; // incomplete / paused: never grant access
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured; rejecting webhook.");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  if (!signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    console.warn("Stripe webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const convex = getConvexServerClient();
  const secret = serverSecret();

  const applySubscription = async (args: {
    orgId?: Id<"organizations">;
    customerId?: string;
    subscriptionId?: string;
    priceId?: string;
    planTier: PlanTier;
    status: SubStatus;
    trialEndsAt?: number;
    currentPeriodEnd?: number;
  }) => {
    await convex.mutation(api.organizations.updateSubscriptionFromStripeInternal, {
      serverSecret: secret,
      orgId: args.orgId,
      stripeCustomerId: args.customerId,
      stripeSubscriptionId: args.subscriptionId,
      stripePriceId: args.priceId,
      planTier: args.planTier,
      subscriptionStatus: args.status,
      trialEndsAt: args.trialEndsAt,
      currentPeriodEnd: args.currentPeriodEnd,
    });
  };

  const unknownPrice = (ctx: string, priceId: string | undefined) =>
    console.warn(`Stripe webhook ${ctx}: price is not a whitelisted plan price; ignoring`, {
      eventId: event.id,
      priceId,
    });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = idOf(session.subscription);
        if (!subscriptionId) break;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = priceIdOf(subscription);
        const planTier = planTierFromPriceId(priceId);
        if (!planTier) {
          unknownPrice(event.type, priceId);
          break;
        }
        await applySubscription({
          orgId: orgIdFrom(session.metadata, session.client_reference_id),
          customerId: idOf(session.customer),
          subscriptionId,
          priceId,
          planTier,
          status: mapStatus(subscription.status),
        });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = priceIdOf(subscription);
        const planTier = planTierFromPriceId(priceId);
        if (!planTier) {
          unknownPrice(event.type, priceId);
          break;
        }
        const periodEnd = (subscription as unknown as { current_period_end?: number })
          .current_period_end;
        await applySubscription({
          orgId: orgIdFrom(subscription.metadata),
          customerId: idOf(subscription.customer),
          subscriptionId: subscription.id,
          priceId,
          planTier,
          status: mapStatus(subscription.status),
          trialEndsAt: subscription.trial_end ? subscription.trial_end * 1000 : undefined,
          currentPeriodEnd: periodEnd ? periodEnd * 1000 : undefined,
        });
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as unknown as {
          subscription?: string | { id: string } | null;
          parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null;
          customer?: string | { id: string } | null;
        };
        const subscriptionId =
          idOf(invoice.subscription) ?? idOf(invoice.parent?.subscription_details?.subscription);
        if (!subscriptionId) break;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = priceIdOf(subscription);
        const planTier = planTierFromPriceId(priceId);
        if (!planTier) {
          unknownPrice(event.type, priceId);
          break;
        }
        await applySubscription({
          orgId: orgIdFrom(subscription.metadata),
          customerId: idOf(invoice.customer) ?? idOf(subscription.customer),
          subscriptionId,
          priceId,
          planTier,
          status: event.type === "invoice.payment_failed" ? "PAST_DUE" : mapStatus(subscription.status),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await convex.mutation(api.organizations.downgradeSubscriptionInternal, {
          serverSecret: secret,
          orgId: orgIdFrom(subscription.metadata),
          stripeCustomerId: idOf(subscription.customer),
          stripeSubscriptionId: subscription.id,
        });
        break;
      }

      default:
        // Ignore unhandled event types.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook processing error", { eventId: event.id, type: event.type, err });
    try {
      await convex.mutation(api.billingEngine.logStripeWebhookFailure, {
        serverSecret: secret,
        eventId: event.id,
        eventType: event.type,
        payload: JSON.stringify(event),
        error: err instanceof Error ? err.message.slice(0, 1000) : "Unknown error",
      });
    } catch (dlqErr) {
      console.error("Failed to log Stripe webhook failure to DLQ", dlqErr);
    }
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
