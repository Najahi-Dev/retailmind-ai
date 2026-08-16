import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { getServerUser } from "@/lib/get-server-user";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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

    // Derive the app origin from the incoming request URL.
    // req.url is always the full URL on Vercel (e.g. https://retailmind-ai-sage.vercel.app/api/...)
    // This is more reliable than the "origin" header (not sent on same-origin requests)
    // and eliminates the need for a NEXT_PUBLIC_APP_URL env var.
    const reqUrl = new URL(req.url);
    const origin = process.env.NEXT_PUBLIC_APP_URL || `${reqUrl.protocol}//${reqUrl.host}`;

    const cookieStore = await cookies();
    const token = cookieStore.get("retailmind_token")?.value;
    let orgId: string | undefined;
    if (token) {
      try {
        const org = await convex.query(api.organizations.getCurrentOrganization, { token });
        if (org?._id) orgId = org._id;
      } catch {}
    }

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
          organization_id: orgId || "",
          plan: plan,
        },
      },
      metadata: {
        userId: userId,
        organization_id: orgId || "",
        plan: plan,
      },
      client_reference_id: orgId || userId,
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
