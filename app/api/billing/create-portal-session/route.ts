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

    const org = await convex.query(api.organizations.getCurrentOrganization, { token });
    if (!org) {
      return NextResponse.json({ error: "Organization record not found." }, { status: 404 });
    }

    if (!org.stripeCustomerId) {
      return NextResponse.json({ error: "No active Stripe customer account associated with this workspace." }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${appUrl}/settings/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: any) {
    console.error("Stripe Customer Portal Error:", err);
    return NextResponse.json({ error: err?.message || "Failed to create portal session." }, { status: 500 });
  }
}
