"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CreditCard, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingShell, PlansGrid, stripeButtonClass, type PublicPlan } from "@/components/pricing/plans-grid";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

interface PricingSectionProps {
  onSelectTrial?: (plan: "STARTER" | "GROWTH") => void | Promise<void>;
  onSubscribeStripe?: (plan: "STARTER" | "GROWTH") => void | Promise<void>;
  className?: string;
  showHeading?: boolean;
}

export function PricingSection({
  onSelectTrial,
  onSubscribeStripe,
  className = "",
  showHeading = true,
}: PricingSectionProps) {
  const router = useRouter();
  const { isAuthenticated, token } = useAuth();
  const activateTrial = useMutation(api.organizations.activateFreeTrial);
  
  const activePlans = useQuery(api.publicPlans.getActivePlans);

  const [loadingTrial, setLoadingTrial] = useState<"STARTER" | "GROWTH" | null>(null);
  const [loadingStripe, setLoadingStripe] = useState<"STARTER" | "GROWTH" | null>(null);

  const handleStartTrial = async (plan: "STARTER" | "GROWTH") => {
    setLoadingTrial(plan);
    try {
      if (onSelectTrial) {
        await onSelectTrial(plan);
        return;
      }

      if (!isAuthenticated) {
        router.push(`/create-workspace?plan=${plan.toLowerCase()}`);
        return;
      }

      await activateTrial({
        token: token ?? undefined,
        selectedPlan: plan.toLowerCase() as "starter" | "growth",
      });
      toast.success(`${plan === "GROWTH" ? "Growth" : "Starter"} 14-day free trial activated!`);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Trial activation error:", err);
      toast.error(err?.message || "Failed to activate trial. Redirecting to dashboard...");
      router.push("/dashboard");
    } finally {
      setLoadingTrial(null);
    }
  };

  const handleSubscribeStripe = async (plan: "STARTER" | "GROWTH") => {
    setLoadingStripe(plan);
    try {
      if (onSubscribeStripe) {
        await onSubscribeStripe(plan);
        return;
      }

      if (!isAuthenticated) {
        router.push(`/create-workspace?plan=${plan.toLowerCase()}&checkout=stripe`);
        return;
      }

      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.toLowerCase() }),
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        } else if (data.redirectUrl) {
          router.push(data.redirectUrl);
          return;
        }
      }

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Stripe checkout error:", err);
      toast.error("Unable to initialize Stripe checkout. Please try again.");
    } finally {
      setLoadingStripe(null);
    }
  };

  return (
    <PricingShell className={className} showHeading={showHeading}>
      {activePlans === undefined ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      ) : (
        <PlansGrid
          plans={activePlans as PublicPlan[]}
          renderActions={(plan, { isRecommended, buttonBg }) =>
            plan.tier === "ENTERPRISE" ? (
              <Button asChild className={`w-full h-11 rounded-xl transition-all duration-200 text-xs sm:text-sm font-semibold ${buttonBg}`}>
                <a href="mailto:sales@retailmind.ai?subject=RetailMind%20AI%20Enterprise%20Plan%20Inquiry">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Enterprise Sales
                </a>
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => handleStartTrial(plan.tier as "STARTER" | "GROWTH")}
                  disabled={loadingTrial === plan.tier || loadingStripe === plan.tier}
                  className={`w-full h-11 rounded-xl transition-all duration-200 text-xs sm:text-sm font-bold ${buttonBg}`}
                >
                  {loadingTrial === plan.tier ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                  Start 14-Day Free Trial
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSubscribeStripe(plan.tier as "STARTER" | "GROWTH")}
                  disabled={loadingTrial === plan.tier || loadingStripe === plan.tier}
                  className={stripeButtonClass(isRecommended)}
                >
                  {loadingStripe === plan.tier ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className={`w-4 h-4 mr-2 ${isRecommended ? "text-violet-600 dark:text-violet-400" : "text-slate-500 dark:text-zinc-400"}`} />
                  )}
                  Subscribe with Card (LKR {plan.monthlyPriceLkr.toLocaleString()})
                </Button>
              </>
            )
          }
        />
      )}
    </PricingShell>
  );
}
