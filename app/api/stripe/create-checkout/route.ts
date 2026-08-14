import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_mock";

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ redirectUrl: "/sign-in" });
    }

    const body = await req.json().catch(() => ({}));
    const priceId =
      body.priceId ||
      process.env.STRIPE_GROWTH_PRICE_ID ||
      "price_growth_lkr4900";
    const plan = body.plan || "growth";

    const userEmail =
      user.emailAddresses?.[0]?.emailAddress || `${userId}@user.retailmind.ai`;
    const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || userEmail;

    // Search for existing Stripe customer by metadata clerkId or email
    let customerId: string | undefined;
    const existingCustomers = await stripe.customers.search({
      query: `metadata['clerkId']:'${userId}' OR email:'${userEmail}'`,
    }).catch(() => ({ data: [] }));

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: userEmail,
        name: userName,
        metadata: {
          clerkId: userId,
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
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        clerkId: userId,
        plan: plan,
      },
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
