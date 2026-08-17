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

        // Determine plan tier from metadata with proper validation
        let planTier: "STARTER" | "GROWTH" | "ENTERPRISE" = "GROWTH"; // default
        const rawPlanTier = session.metadata?.plan_tier;
        const rawPlan = session.metadata?.plan;

        // Check plan_tier first (what we actually set in checkout)
        if (typeof rawPlanTier === "string" && rawPlanTier.trim() !== "") {
          const upper = rawPlanTier.toUpperCase();
          if (upper === "STARTER" || upper === "GROWTH" || upper === "ENTERPRISE") {
            planTier = upper as "STARTER" | "GROWTH" | "ENTERPRISE";
          }
        }
        // If plan_tier is invalid, check plan as fallback
        else if (typeof rawPlan === "string" && rawPlan.trim() !== "") {
          const upper = rawPlan.toUpperCase();
          if (upper === "STARTER" || upper === "GROWTH" || upper === "ENTERPRISE") {
            planTier = upper as "STARTER" | "GROWTH" | "ENTERPRISE";
          }
        }
        // If both are invalid, we keep the default (GROWTH) but log a warning
        else {
          console.warn("Stripe checkout session metadata missing or invalid plan_tier/plan", {
            sessionId: session.id,
            hasPlanTier: !!session.metadata?.plan_tier,
            planTierValue: session.metadata?.plan_tier,
            hasPlan: !!session.metadata?.plan,
            planValue: session.metadata?.plan
          });
        }

        await convex.mutation(api.organizations.updateSubscriptionFromStripeInternal, {
          orgId: orgId || undefined,
          stripeCustomerId: customerId || undefined,
          stripeSubscriptionId: subscriptionId || undefined,
          userId: userId || undefined,
          planTier: planTier,
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

        // Determine plan tier from metadata with proper validation
        let planTier: "STARTER" | "GROWTH" | "ENTERPRISE" = "GROWTH"; // default
        const rawPlanTier = subscription.metadata?.plan_tier;
        const rawPlan = subscription.metadata?.plan;

        // Check plan_tier first (what we actually set in subscription_data)
        if (typeof rawPlanTier === "string" && rawPlanTier.trim() !== "") {
          const upper = rawPlanTier.toUpperCase();
          if (upper === "STARTER" || upper === "GROWTH" || upper === "ENTERPRISE") {
            planTier = upper as "STARTER" | "GROWTH" | "ENTERPRISE";
          }
        }
        // If plan_tier is invalid, check plan as fallback
        else if (typeof rawPlan === "string" && rawPlan.trim() !== "") {
          const upper = rawPlan.toUpperCase();
          if (upper === "STARTER" || upper === "GROWTH" || upper === "ENTERPRISE") {
            planTier = upper as "STARTER" | "GROWTH" | "ENTERPRISE";
          }
        }
        // If both are invalid, we keep the default (GROWTH) but log a warning
        else {
          console.warn("Stripe subscription metadata missing or invalid plan_tier/plan", {
            subscriptionId: subscription.id,
            hasPlanTier: !!subscription.metadata?.plan_tier,
            planTierValue: subscription.metadata?.plan_tier,
            hasPlan: !!subscription.metadata?.plan,
            planValue: subscription.metadata?.plan
          });
        }

        await convex.mutation(api.organizations.updateSubscriptionFromStripeInternal, {
          orgId: orgId || undefined,
          stripeCustomerId: customerId || undefined,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          userId: userId || undefined,
          planTier: planTier,
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
          // Determine plan tier from price ID (most reliable) or metadata
          let planTier: "STARTER" | "GROWTH" | "ENTERPRISE" = "GROWTH"; // default
          if (subscriptionId) {
            try {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              const priceId = subscription.items.data[0]?.price?.id;

              // Determine plan from price ID (authoritative source)
              if (priceId === process.env.STRIPE_STARTER_PRICE_ID) {
                planTier = "STARTER";
              } else if (priceId === process.env.STRIPE_GROWTH_PRICE_ID) {
                planTier = "GROWTH";
                // Note: ENTERPRISE price ID check would go here if we had it
              } else {
                // Fall back to metadata if price ID doesn't match our known plans
                const rawPlanTier = subscription.metadata?.plan_tier;
                const rawPlan = subscription.metadata?.plan;

                // Check plan_tier first
                if (typeof rawPlanTier === "string" && rawPlanTier.trim() !== "") {
                  const upper = rawPlanTier.toUpperCase();
                  if (upper === "STARTER" || upper === "GROWTH" || upper === "ENTERPRISE") {
                    planTier = upper as "STARTER" | "GROWTH" | "ENTERPRISE";
                  }
                }
                // If plan_tier is invalid, check plan as fallback
                else if (typeof rawPlan === "string" && rawPlan.trim() !== "") {
                  const upper = rawPlan.toUpperCase();
                  if (upper === "STARTER" || upper === "GROWTH" || upper === "ENTERPRISE") {
                    planTier = upper as "STARTER" | "GROWTH" | "ENTERPRISE";
                  }
                }
                // If both are invalid, we keep the default (GROWTH) but log a warning
                else {
                  console.warn("Stripe subscription metadata missing or invalid plan_tier/plan", {
                    subscriptionId: subscription.id,
                    hasPlanTier: !!subscription.metadata?.plan_tier,
                    planTierValue: subscription.metadata?.plan_tier,
                    hasPlan: !!subscription.metadata?.plan,
                    planValue: subscription.metadata?.plan,
                    priceId: priceId
                  });
                }
              }
            } catch (error) {
              console.warn("Failed to retrieve subscription for plan tier:", error);
              // Keep default
            }
          }

          await convex.mutation(api.organizations.updateSubscriptionFromStripeInternal, {
            stripeCustomerId: customerId || undefined,
            stripeSubscriptionId: subscriptionId || undefined,
            planTier: planTier,
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
          // Determine plan tier from metadata with proper validation
          let planTier: "STARTER" | "GROWTH" | "ENTERPRISE" = "GROWTH"; // default
          if (subscriptionId) {
            try {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              orgId = subscription.metadata?.organization_id as any;
              const rawPlanTier = subscription.metadata?.plan_tier;
              const rawPlan = subscription.metadata?.plan;

              // Check plan_tier first
              if (typeof rawPlanTier === "string" && rawPlanTier.trim() !== "") {
                const upper = rawPlanTier.toUpperCase();
                if (upper === "STARTER" || upper === "GROWTH" || upper === "ENTERPRISE") {
                  planTier = upper as "STARTER" | "GROWTH" | "ENTERPRISE";
                }
              }
              // If plan_tier is invalid, check plan as fallback
              else if (typeof rawPlan === "string" && rawPlan.trim() !== "") {
                const upper = rawPlan.toUpperCase();
                if (upper === "STARTER" || upper === "GROWTH" || upper === "ENTERPRISE") {
                  planTier = upper as "STARTER" | "GROWTH" | "ENTERPRISE";
                }
              }
              // If both are invalid, we keep the default (GROWTH) but log a warning
              else {
                console.warn("Stripe subscription metadata missing or invalid plan_tier/plan", {
                  subscriptionId: subscription.id,
                  hasPlanTier: !!subscription.metadata?.plan_tier,
                  planTierValue: subscription.metadata?.plan_tier,
                  hasPlan: !!subscription.metadata?.plan,
                  planValue: subscription.metadata?.plan
                });
              }
            } catch (error) {
              console.warn("Failed to retrieve subscription for plan tier:", error);
              // Keep defaults
            }
          }

          await convex.mutation(api.organizations.updateSubscriptionFromStripeInternal, {
            orgId: orgId || undefined,
            stripeCustomerId: customerId || undefined,
            stripeSubscriptionId: subscriptionId || undefined,
            planTier: planTier,
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
    
    // Log to DLQ
    try {
      if (event) {
        await convex.mutation(api.billingEngine.logStripeWebhookFailure, {
          eventId: event.id,
          eventType: event.type,
          payload: JSON.stringify(event),
          error: err?.message || "Unknown error",
        });
      }
    } catch (dlqErr) {
      console.error("Failed to log to DLQ", dlqErr);
    }
    
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
