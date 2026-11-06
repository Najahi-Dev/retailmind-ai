"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Zap,
  Sparkles,
  Building2,
  ArrowRight,
  CreditCard,
  Loader2,
  ShieldCheck,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const getFeaturesList = (plan: any) => {
  const f = plan.features;
  if (!f) return [];
  const list = [];
  
  if (plan.tier === "ENTERPRISE") {
    if (f.storeLimit === "unlimited") list.push("Unlimited Multi-Location Store Sync");
    else list.push(`Up to ${f.storeLimit} Locations Sync`);
    list.push("Custom POS API & ERP Integrations");
    list.push("Dedicated Neural Forecasting Model Tuning");
    if (f.supplierPortal) list.push("Vendor & Supplier Fulfillment Portal");
    if (f.fullRbac) list.push("Full RBAC Access Delegation Engine");
    list.push("Dedicated Account Manager & 99.9% SLA");
    return list;
  }

  if (f.activeSkuLimit === "unlimited") list.push("Unlimited Products & Active SKUs");
  else list.push(`Up to ${f.activeSkuLimit.toLocaleString()} Active SKUs`);

  if (f.storeLimit === "unlimited") list.push("Unlimited Multi-Location Store Sync");
  else if (f.storeLimit === 1) list.push("Single Store Location");
  else list.push(`Multi-Branch Support (Up to ${f.storeLimit} Stores)`);

  if (plan.tier === "STARTER") {
    list.push("Low Stock & Expiry Alerts");
    if (!f.automatedReorder) list.push("Manual Purchase Orders (COD & Cheque logging)");
  } else {
    if (f.aiDemandForecasting) list.push("AI SKU Demand Forecasting Engine");
    if (f.automatedReorder) list.push("Automated Reorder & Safety Stock Engine");
    if (f.dynamicPricing) list.push("Dynamic Expiry Markdowns & Price Cuts");
  }

  if (f.staffUserLimit === "unlimited") list.push("Unlimited Manager & Staff Accounts");
  else list.push(`${f.staffUserLimit} Staff User Accounts`);
  
  if (plan.tier === "GROWTH") list.push("Priority 24/7 Support");
  else if (plan.tier === "STARTER") list.push("Standard Email Support");

  return list;
};

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
    <section
      id="pricing"
      className={`relative py-24 sm:py-32 w-full overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-zinc-950 dark:via-zinc-900/90 dark:to-zinc-950 transition-colors duration-300 ${className}`}
    >
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.08] dark:opacity-[0.18]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_40%_at_50%_50%,rgba(124,58,237,0.10),transparent_70%),radial-gradient(ellipse_25%_30%_at_70%_10%,rgba(99,102,241,0.10),transparent_70%)] dark:bg-[radial-gradient(ellipse_45%_40%_at_50%_50%,rgba(124,58,237,0.16),transparent_70%),radial-gradient(ellipse_25%_30%_at_70%_10%,rgba(99,102,241,0.15),transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {showHeading && (
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold tracking-wide shadow-sm">
              <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 fill-indigo-600 dark:fill-indigo-400" />
              <span>⚡ Transparent &amp; Scalable Pricing</span>
            </div>
            <h2 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              Predictable plans built to grow with your supermarket
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Start with our risk-free 14-day trial. No credit card required to explore AI demand intelligence.
            </p>
          </div>
        )}

        {activePlans === undefined ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          </div>
        ) : activePlans.length === 0 ? (
          <div className="text-center py-24 text-slate-500">
            No active plans available at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-2">
            {activePlans.map((plan: any) => {
              const features = getFeaturesList(plan);
              const isRecommended = plan.isRecommended;
              
              let Icon = Zap;
              let iconColor = "text-indigo-600 dark:text-indigo-400";
              let badgeText = "Single Branch";
              let buttonBg = "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 text-white";
              
              if (plan.tier === "GROWTH") {
                Icon = Sparkles;
                iconColor = "text-violet-600 dark:text-violet-400";
                badgeText = "AI Demand Engine";
                buttonBg = "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30 border-0";
              } else if (plan.tier === "ENTERPRISE") {
                Icon = Building2;
                badgeText = "Multi-Chain";
                buttonBg = "bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white";
              }

              return (
                <div 
                  key={plan._id} 
                  className={`bg-white dark:bg-zinc-900/70 border rounded-2xl p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 relative group
                    ${isRecommended 
                      ? 'border-2 border-violet-600 dark:border-violet-500 shadow-2xl shadow-violet-500/10 dark:shadow-violet-950/40 lg:-translate-y-2 z-20' 
                      : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-xl hover:-translate-y-1 shadow-sm'
                    }
                  `}
                >
                  {isRecommended && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30">
                      <span className="inline-flex items-center gap-1.5 bg-violet-600 dark:bg-violet-500 text-white font-bold text-[11px] uppercase tracking-wider px-4 py-1 rounded-full shadow-lg shadow-violet-600/40 ring-2 ring-white dark:ring-zinc-900">
                        <Sparkles className="w-3 h-3 fill-white" />
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  <div className={`space-y-6 ${isRecommended ? 'pt-1' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform
                        ${isRecommended ? 'bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/80' : 'bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/80'}
                      `}>
                        <Icon className={`w-5 h-5 ${iconColor}`} />
                      </div>
                      <Badge
                        variant={isRecommended ? "default" : "outline"}
                        className={`text-[11px] font-semibold px-2.5 py-0.5
                          ${isRecommended ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/80' : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'}
                        `}
                      >
                        {badgeText}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                        {plan.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1.5 min-h-[38px] leading-relaxed">
                        {plan.description}
                      </p>
                    </div>

                    <div className={`pt-2 border-t ${isRecommended ? 'border-violet-100 dark:border-zinc-800/80' : 'border-slate-100 dark:border-zinc-800/80'}`}>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          {plan.monthlyPriceLkr === 0 ? "Custom" : `LKR ${plan.monthlyPriceLkr.toLocaleString()}`}
                        </span>
                        {plan.monthlyPriceLkr !== 0 && (
                          <span className="text-slate-500 dark:text-zinc-400 text-xs font-medium">
                            / month
                          </span>
                        )}
                      </div>
                      {plan.tier === "ENTERPRISE" ? (
                        <p className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-zinc-400 font-semibold mt-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>Tailored Onboarding &amp; Migration Support</span>
                        </p>
                      ) : (
                        <p className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>🛡 14-day free trial included</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 pt-2">
                      <p className={`text-xs font-bold uppercase tracking-wider ${isRecommended ? 'text-violet-700 dark:text-violet-400' : 'text-slate-400 dark:text-zinc-500'}`}>
                        Included in {plan.name}:
                      </p>
                      <ul className={`space-y-3 text-xs sm:text-sm ${isRecommended ? 'text-slate-800 dark:text-zinc-200 font-medium' : 'text-slate-700 dark:text-zinc-300'}`}>
                        {features.map((feature: string, idx: number) => (
                          <li key={idx} className="flex items-center gap-2.5">
                            <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                              <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                            </span>
                            <span className={isRecommended && idx === 0 ? "font-semibold text-slate-900 dark:text-white" : ""}>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8 space-y-2.5 mt-auto">
                    {plan.tier === "ENTERPRISE" ? (
                      <Button
                        asChild
                        className={`w-full h-11 rounded-xl transition-all duration-200 text-xs sm:text-sm font-semibold ${buttonBg}`}
                      >
                        <a href="mailto:sales@retailmind.ai?subject=RetailMind%20AI%20Enterprise%20Plan%20Inquiry">
                          <Mail className="w-4 h-4 mr-2" />
                          Contact Enterprise Sales
                        </a>
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleStartTrial(plan.tier)}
                          disabled={loadingTrial === plan.tier || loadingStripe === plan.tier}
                          className={`w-full h-11 rounded-xl transition-all duration-200 text-xs sm:text-sm font-bold ${buttonBg}`}
                        >
                          {loadingTrial === plan.tier ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <ArrowRight className="w-4 h-4 mr-2" />
                          )}
                          Start 14-Day Free Trial
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => handleSubscribeStripe(plan.tier)}
                          disabled={loadingTrial === plan.tier || loadingStripe === plan.tier}
                          className={`w-full h-11 rounded-xl transition-all duration-200 text-xs sm:text-sm font-semibold
                            ${isRecommended 
                              ? 'border-violet-300 dark:border-violet-700/80 bg-violet-50/50 dark:bg-violet-950/20 hover:bg-violet-100 dark:hover:bg-violet-950/50 text-violet-700 dark:text-violet-300' 
                              : 'border-slate-300 dark:border-zinc-700 bg-transparent hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200'
                            }
                          `}
                        >
                          {loadingStripe === plan.tier ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <CreditCard className={`w-4 h-4 mr-2 ${isRecommended ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 dark:text-zinc-400'}`} />
                          )}
                          Subscribe with Card (LKR {plan.monthlyPriceLkr.toLocaleString()})
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-16 pt-8 border-t border-slate-200/80 dark:border-zinc-800/80 text-center flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>No credit card required for 14-day free trial</span>
          </div>
          <div className="hidden sm:inline">•</div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-500" />
            <span>Secure 256-bit Stripe Checkout &amp; Invoicing</span>
          </div>
          <div className="hidden sm:inline">•</div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Instant workspace provisioning</span>
          </div>
        </div>
      </div>
    </section>
  );
}
