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
import { useMutation } from "convex/react";
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
      {/* Background Decorative Mesh Grid & Subtle Radial Glows */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.08] dark:opacity-[0.18]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-violet-600/10 dark:bg-violet-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {showHeading && (
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20 space-y-4">
            {/* Centered Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold tracking-wide shadow-sm">
              <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 fill-indigo-600 dark:fill-indigo-400" />
              <span>⚡ Transparent &amp; Scalable Pricing</span>
            </div>

            {/* Main Heading */}
            <h2 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              Predictable plans built to grow with your supermarket
            </h2>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Start with our risk-free 14-day trial. No credit card required to explore AI demand intelligence.
            </p>
          </div>
        )}

        {/* 3-Column Responsive Grid with Equal Card Heights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-2">
          {/* ══════════════════════════════════════════════════════════════════════════
              PLAN 1: STARTER PLAN
          ══════════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 rounded-2xl p-7 sm:p-8 flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 shadow-sm relative group">
            <div className="space-y-6">
              {/* Card Header Top */}
              <div className="flex items-center justify-between gap-2">
                <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/80 flex items-center justify-center text-slate-700 dark:text-zinc-300 shadow-sm group-hover:scale-105 transition-transform">
                  <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <Badge
                  variant="outline"
                  className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 text-[11px] font-semibold px-2.5 py-0.5"
                >
                  Single Branch
                </Badge>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                  Starter
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1.5 min-h-[38px] leading-relaxed">
                  Essential inventory tracking for single-branch stores getting started.
                </p>
              </div>

              {/* Price Display */}
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    LKR 2,500
                  </span>
                  <span className="text-slate-500 dark:text-zinc-400 text-xs font-medium">
                    / month
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>🛡 14-day free trial included</span>
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Included in Starter:
                </p>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-zinc-300">
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span>Up to 100 Active SKUs</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span>Single Store Location</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span>Low Stock &amp; Expiry Alerts</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span>Manual Purchase Orders (COD &amp; Cheque logging)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span>2 Staff User Accounts</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span>Standard Email Support</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-8 space-y-2.5 mt-auto">
              <Button
                onClick={() => handleStartTrial("STARTER")}
                disabled={loadingTrial === "STARTER" || loadingStripe === "STARTER"}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 text-white font-semibold h-11 rounded-xl shadow-sm transition-all duration-200 cursor-pointer text-xs sm:text-sm"
              >
                {loadingTrial === "STARTER" ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Start 14-Day Free Trial
              </Button>

              <Button
                variant="outline"
                onClick={() => handleSubscribeStripe("STARTER")}
                disabled={loadingTrial === "STARTER" || loadingStripe === "STARTER"}
                className="w-full border-slate-300 dark:border-zinc-700 bg-transparent hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold h-11 rounded-xl transition-all duration-200 cursor-pointer text-xs sm:text-sm"
              >
                {loadingStripe === "STARTER" ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2 text-slate-500 dark:text-zinc-400" />
                )}
                Subscribe with Card (LKR 2,500)
              </Button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════════
              PLAN 2: GROWTH PLAN (HERO / MOST POPULAR)
          ══════════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white dark:bg-zinc-900/90 border-2 border-violet-600 dark:border-violet-500 rounded-2xl p-7 sm:p-8 flex flex-col justify-between shadow-2xl shadow-violet-500/10 dark:shadow-violet-950/40 relative lg:-translate-y-2 transition-all duration-300 z-20 group">
            {/* Floated Pill Badge at Top-Center */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30">
              <span className="inline-flex items-center gap-1.5 bg-violet-600 dark:bg-violet-500 text-white font-bold text-[11px] uppercase tracking-wider px-4 py-1 rounded-full shadow-lg shadow-violet-600/40 ring-2 ring-white dark:ring-zinc-900">
                <Sparkles className="w-3 h-3 fill-white" />
                MOST POPULAR
              </span>
            </div>

            <div className="space-y-6 pt-1">
              {/* Card Header Top */}
              <div className="flex items-center justify-between gap-2">
                <div className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/80 flex items-center justify-center text-violet-600 dark:text-violet-400 shadow-sm group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <Badge
                  className="bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/80 text-[11px] font-semibold px-2.5 py-0.5"
                >
                  AI Demand Engine
                </Badge>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
                  Growth
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 mt-1.5 min-h-[38px] leading-relaxed font-normal">
                  Complete AI demand forecasting &amp; automated replenishment engine.
                </p>
              </div>

              {/* Price Display */}
              <div className="pt-2 border-t border-violet-100 dark:border-zinc-800/80">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    LKR 4,900
                  </span>
                  <span className="text-slate-500 dark:text-zinc-400 text-xs font-medium">
                    / month
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>🛡 14-day free trial included</span>
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                  Included in Growth:
                </p>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-800 dark:text-zinc-200 font-medium">
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">Unlimited Products &amp; Active SKUs</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span>Multi-Branch Support (Up to 3 Stores)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span>AI SKU Demand Forecasting Engine</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span>Automated Reorder &amp; Safety Stock Engine</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span>Dynamic Expiry Markdowns &amp; Price Cuts</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span>Unlimited Manager &amp; Staff Accounts</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span>Priority 24/7 Support</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-8 space-y-2.5 mt-auto">
              <Button
                onClick={() => handleStartTrial("GROWTH")}
                disabled={loadingTrial === "GROWTH" || loadingStripe === "GROWTH"}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-violet-600/30 dark:shadow-violet-600/20 active:scale-[0.99] transition-all duration-200 cursor-pointer text-xs sm:text-sm border-0"
              >
                {loadingTrial === "GROWTH" ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Start 14-Day Free Trial
              </Button>

              <Button
                variant="outline"
                onClick={() => handleSubscribeStripe("GROWTH")}
                disabled={loadingTrial === "GROWTH" || loadingStripe === "GROWTH"}
                className="w-full border-violet-300 dark:border-violet-700/80 bg-violet-50/50 dark:bg-violet-950/20 hover:bg-violet-100 dark:hover:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-semibold h-11 rounded-xl transition-all duration-200 cursor-pointer text-xs sm:text-sm"
              >
                {loadingStripe === "GROWTH" ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2 text-violet-600 dark:text-violet-400" />
                )}
                Subscribe with Card (LKR 4,900)
              </Button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════════
              PLAN 3: ENTERPRISE PLAN
          ══════════════════════════════════════════════════════════════════════════ */}
          <div className="bg-white dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 rounded-2xl p-7 sm:p-8 flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 shadow-sm relative group">
            <div className="space-y-6">
              {/* Card Header Top */}
              <div className="flex items-center justify-between gap-2">
                <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/80 flex items-center justify-center text-slate-700 dark:text-zinc-300 shadow-sm group-hover:scale-105 transition-transform">
                  <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <Badge
                  variant="outline"
                  className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 text-[11px] font-semibold px-2.5 py-0.5"
                >
                  Multi-Chain
                </Badge>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                  Enterprise
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1.5 min-h-[38px] leading-relaxed">
                  For multi-branch supermarket chains &amp; franchise retail networks.
                </p>
              </div>

              {/* Price Display */}
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Custom
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-zinc-400 font-semibold mt-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Tailored Onboarding &amp; Migration Support</span>
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Included in Enterprise:
                </p>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-zinc-300">
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span>Unlimited Multi-Location Store Sync</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span>Custom POS API &amp; ERP Integrations</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span>Dedicated Neural Forecasting Model Tuning</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span>Vendor &amp; Supplier Fulfillment Portal</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span>Full RBAC Access Delegation Engine</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="size-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                    </span>
                    <span>Dedicated Account Manager &amp; 99.9% SLA</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-8 space-y-2.5 mt-auto">
              <Button
                asChild
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white font-semibold h-11 rounded-xl shadow-sm transition-all duration-200 cursor-pointer text-xs sm:text-sm"
              >
                <a href="mailto:sales@retailmind.ai?subject=RetailMind%20AI%20Enterprise%20Plan%20Inquiry">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Enterprise Sales
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Trust & Guarantee Footer */}
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
