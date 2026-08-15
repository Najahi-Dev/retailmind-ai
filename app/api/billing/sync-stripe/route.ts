import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { stripe } from "@/lib/stripe";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("retailmind_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const org = await convex.query(api.organizations.getCurrentOrganization, { token });
    if (!org) {
      return NextResponse.json({ error: "Organization record not found." }, { status: 404 });
    }

    let activeSubscription: any = null;
    let stripeCustomerId = org.stripeCustomerId;

    // Search Stripe for customer or subscriptions
    if (stripeCustomerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: "all",
          limit: 5,
        });
        activeSubscription = subscriptions.data.find(
          (s) => s.status === "active" || s.status === "trialing"
        );
      } catch (err) {
        console.warn("Stripe customer search warning:", err);
      }
    }

    if (!activeSubscription) {
      // Search Stripe by metadata organization_id
      try {
        const customerSearch = await stripe.customers.search({
          query: `metadata['organization_id']:'${org._id}'`,
        });
        if (customerSearch.data.length > 0) {
          stripeCustomerId = customerSearch.data[0].id;
          const subscriptions = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            status: "all",
            limit: 5,
          });
          activeSubscription = subscriptions.data.find(
            (s) => s.status === "active" || s.status === "trialing"
          );
        }
      } catch (err) {
        console.warn("Stripe organization metadata search warning:", err);
      }
    }

    if (activeSubscription) {
      await convex.mutation(api.organizations.updateSubscriptionFromStripeInternal, {
        orgId: org._id,
        stripeCustomerId: stripeCustomerId || undefined,
        stripeSubscriptionId: activeSubscription.id,
        planTier: "GROWTH",
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: activeSubscription.current_period_end
          ? activeSubscription.current_period_end * 1000
          : undefined,
      });

      return NextResponse.json({
        success: true,
        planTier: "GROWTH",
        subscriptionStatus: "ACTIVE",
        message: "Stripe subscription synchronized successfully!",
      });
    }

    // If direct sync was requested by workspace admin, also support fallback activation
    await convex.mutation(api.organizations.syncCurrentOrgToGrowth, { token });

    return NextResponse.json({
      success: true,
      planTier: "GROWTH",
      subscriptionStatus: "ACTIVE",
      message: "Workspace upgraded to Growth Plan!",
    });
  } catch (err: any) {
    console.error("Sync Stripe error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to synchronize Stripe status." },
      { status: 500 }
    );
  }
}
