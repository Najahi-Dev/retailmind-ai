// Server Component: pricing for the landing page without the Convex realtime client.
// Plans are fetched once per render over HTTP; the page is statically regenerated
// (see `revalidate` in app/page.tsx), so visitors never wait for this request.
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { PricingShell, PlansGrid, type PublicPlan } from "@/components/pricing/plans-grid";
import { PlanCtas } from "@/components/landing/plan-ctas";

async function loadPlans(): Promise<PublicPlan[]> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return [];
  try {
    const plans = await new ConvexHttpClient(url).query(api.publicPlans.getActivePlans, {});
    return plans as unknown as PublicPlan[];
  } catch (err) {
    console.error("Landing pricing: failed to load plans", err);
    return [];
  }
}

export async function LandingPricing() {
  const plans = await loadPlans();
  return (
    <PricingShell>
      <PlansGrid
        plans={plans}
        renderActions={(plan, { isRecommended, buttonBg }) => (
          <PlanCtas
            tier={plan.tier}
            monthlyPriceLkr={plan.monthlyPriceLkr}
            isRecommended={isRecommended}
            buttonBg={buttonBg}
          />
        )}
      />
    </PricingShell>
  );
}
