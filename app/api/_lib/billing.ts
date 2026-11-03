// app/api/_lib/billing.ts
// Server-side plan <-> Stripe price mapping. The plan tier of a subscription is
// ALWAYS derived from the Stripe price ID against this whitelist — never from
// client-supplied values or metadata.
import { z } from "zod";

export type PlanTier = "STARTER" | "GROWTH" | "ENTERPRISE";

/** Plans that can be bought through self-serve Stripe checkout. */
export const checkoutPlanSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
  z.enum(["starter", "growth"]),
);
export type CheckoutPlan = z.infer<typeof checkoutPlanSchema>;

const PLAN_TIER: Record<CheckoutPlan, PlanTier> = { starter: "STARTER", growth: "GROWTH" };

function configuredPrice(envName: string): string | null {
  const v = process.env[envName];
  return v && v.startsWith("price_") ? v : null;
}

/** Server-side price ID for a plan, or null if not configured. */
export function priceIdForPlan(plan: CheckoutPlan): string | null {
  return configuredPrice(plan === "starter" ? "STRIPE_STARTER_PRICE_ID" : "STRIPE_GROWTH_PRICE_ID");
}

export function planTierForPlan(plan: CheckoutPlan): PlanTier {
  return PLAN_TIER[plan];
}

/** Maps a Stripe price ID to a plan tier via the env whitelist; null if unknown. */
export function planTierFromPriceId(priceId: string | null | undefined): PlanTier | null {
  if (!priceId) return null;
  const table: Array<[string, PlanTier]> = [
    ["STRIPE_STARTER_PRICE_ID", "STARTER"],
    ["STRIPE_GROWTH_PRICE_ID", "GROWTH"],
    ["STRIPE_ENTERPRISE_PRICE_ID", "ENTERPRISE"],
  ];
  for (const [env, tier] of table) {
    const configured = configuredPrice(env);
    if (configured && configured === priceId) return tier;
  }
  return null;
}

export function appOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}
