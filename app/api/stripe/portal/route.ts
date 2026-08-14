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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail =
      user.emailAddresses?.[0]?.emailAddress || `${userId}@user.retailmind.ai`;

    // Retrieve Customer from Stripe
    let customerId: string | undefined;
    const existingCustomers = await stripe.customers.search({
      query: `metadata['clerkId']:'${userId}' OR email:'${userEmail}'`,
    }).catch(() => ({ data: [] }));

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: userEmail,
        metadata: { clerkId: userId },
      });
      customerId = newCustomer.id;
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard/settings/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error("Stripe portal session error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create portal session" },
      { status: 500 }
    );
  }
}
