import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerUser } from "@/lib/get-server-user";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_mock";

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
});

export async function POST(req: Request) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ redirectUrl: "/sign-in" });
    }

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Access Denied: Only Workspace Admins can initiate subscription billing." }, { status: 403 });
    }

    const userId = user.id;
    const body = await req.json().catch(() => ({}));
    const priceId =
      body.priceId ||
      process.env.STRIPE_GROWTH_PRICE_ID ||
      "price_growth_lkr4900";
    const plan = body.plan || "growth";

    const userEmail = user.email || `${userId}@user.retailmind.ai`;
    const userName = user.name || userEmail;

    // Search for existing Stripe customer by metadata userId or email
    let customerId: string | undefined;
    const existingCustomers = await stripe.customers.search({
      query: `metadata['userId']:'${userId}' OR email:'${userEmail}'`,
    }).catch(() => ({ data: [] }));

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: userEmail,
        name: userName,
        metadata: {
          userId: userId,
        },
      });
      customerId = newCustomer.id;
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      line_items: [
        priceId && priceId.startsWith("price_")
          ? { price: priceId, quantity: 1 }
          : {
              price_data: {
                currency: "lkr",
                product_data: {
                  name: `${plan.toUpperCase()} Plan (RetailMind AI)`,
                },
                unit_amount: plan === "starter" ? 250000 : 490000,
                recurring: { interval: "month" },
              },
              quantity: 1,
            },
      ],
      subscription_data: {
        metadata: {
          userId: userId,
          plan: plan,
        },
      },
      metadata: {
        userId: userId,
        plan: plan,
      },
      client_reference_id: userId,
      success_url: `${origin}/dashboard?subscription=success&plan=${plan}`,
      cancel_url: `${origin}/#pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe create-checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
