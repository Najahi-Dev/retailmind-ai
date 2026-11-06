"use client";

import { IntentLink } from "@/components/landing/intent-link";
import { ArrowRight, CreditCard, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stripeButtonClass, type PlanTier } from "@/components/pricing/plans-grid";
import { useSessionHint } from "@/lib/session-hint";

/**
 * Plan buttons for the landing page. Visitors go to sign-up with the chosen plan;
 * signed-in users go to /select-plan, which has the full trial / Stripe flow.
 */
export function PlanCtas({
  tier,
  monthlyPriceLkr,
  isRecommended,
  buttonBg,
}: {
  tier: PlanTier;
  monthlyPriceLkr: number;
  isRecommended: boolean;
  buttonBg: string;
}) {
  const { isAuthenticated } = useSessionHint();

  if (tier === "ENTERPRISE") {
    return (
      <Button asChild className={`w-full h-11 rounded-xl transition-all duration-200 text-xs sm:text-sm font-semibold ${buttonBg}`}>
        <a href="mailto:sales@retailmind.ai?subject=RetailMind%20AI%20Enterprise%20Plan%20Inquiry">
          <Mail className="w-4 h-4 mr-2" />
          Contact Enterprise Sales
        </a>
      </Button>
    );
  }

  const plan = tier.toLowerCase();
  const trialHref = isAuthenticated ? "/select-plan" : `/create-workspace?plan=${plan}`;
  const stripeHref = isAuthenticated ? "/select-plan" : `/create-workspace?plan=${plan}&checkout=stripe`;

  return (
    <>
      <Button asChild className={`w-full h-11 rounded-xl transition-all duration-200 text-xs sm:text-sm font-bold ${buttonBg}`}>
        <IntentLink href={trialHref}>
          <ArrowRight className="w-4 h-4 mr-2" />
          Start 14-Day Free Trial
        </IntentLink>
      </Button>
      <Button asChild variant="outline" className={stripeButtonClass(isRecommended)}>
        <IntentLink href={stripeHref}>
          <CreditCard className={`w-4 h-4 mr-2 ${isRecommended ? "text-violet-600 dark:text-violet-400" : "text-slate-500 dark:text-zinc-400"}`} />
          Subscribe with Card (LKR {monthlyPriceLkr.toLocaleString()})
        </IntentLink>
      </Button>
    </>
  );
}
