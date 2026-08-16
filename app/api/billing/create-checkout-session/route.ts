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
      return NextResponse.json({ error: "Unauthorized access. Please log in." }, { status: 401 });
    }

    // Retrieve current user and organization
    const org = await convex.query(api.organizations.getCurrentOrganization, { token });
    if (!org) {
      return NextResponse.json({ error: "Organization record not found." }, { status: 404 });
    }

    if (org.userRole !== "admin") {
      return NextResponse.json({ error: "Access Denied: Only Workspace Admins can initiate subscription checkout." }, { status: 403 });
    }

    const reqUrl = new URL(req.url);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${reqUrl.protocol}//${reqUrl.host}`;
    let stripeCustomerId = org.stripeCustomerId;

    // Check or create Stripe Customer
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: {
          organization_id: org._id,
        },
      });
      stripeCustomerId = customer.id;
      await convex.mutation(api.organizations.updateStripeCustomerIdInternal, {
        orgId: org._id,
        stripeCustomerId: customer.id,
      });
    }

    const priceId = process.env.STRIPE_GROWTH_PRICE_ID;
    const lineItem = priceId && priceId.startsWith("price_")
      ? { price: priceId, quantity: 1 }
      : {
          price_data: {
            currency: "lkr",
            product_data: {
              name: "Growth Plan (RetailMind AI)",
              description: "Unlimited SKUs, AI Demand Forecasting & Automated Reorders",
            },
            unit_amount: 490000, // 4,900 LKR in cents
            recurring: { interval: "month" as const },
          },
          quantity: 1,
        };

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [lineItem],
      subscription_data: {
        metadata: {
          organization_id: org._id,
        },
      },
      metadata: {
        organization_id: org._id,
      },
      success_url: `${appUrl}/dashboard?billing=success`,
      cancel_url: `${appUrl}/select-plan?billing=cancelled`,
      client_reference_id: org._id,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe Checkout Error:", err);
    return NextResponse.json({ error: err?.message || "Failed to create checkout session." }, { status: 500 });
  }
}
