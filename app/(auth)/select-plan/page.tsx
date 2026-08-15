"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  CheckCircle2Icon,
  CheckIcon,
  SparklesIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  ZapIcon,
  Building2Icon,
  Loader2Icon,
} from "lucide-react";
import { toast } from "sonner";

export default function SelectPlanPage() {
  const router = useRouter();
  const { currentUser, token } = useAuth();

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planKey: string) => {
    setLoadingPlan(planKey);
    try {
      if (planKey === "growth" || planKey === "starter") {
        // Trigger checkout or activate trial
        toast.success(`Activated 14-day free trial on the ${planKey.toUpperCase()} plan!`);
        router.replace("/dashboard");
      } else if (planKey === "enterprise") {
        window.location.href = "mailto:sales@retailmind.ai?subject=RetailMind%20Enterprise%20Plan%20Inquiry";
      } else {
        router.replace("/dashboard");
      }
    } catch (err: any) {
      toast.error("Failed to select plan. Proceeding to dashboard...");
      router.replace("/dashboard");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between transition-colors">
      {/* Top Navbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <Logo size="sm" href="/" layout="horizontal" />
        <div className="flex items-center gap-4">
          <ModeToggle />
          <Button variant="ghost" onClick={() => router.replace("/dashboard")} className="text-xs font-semibold">
            Skip to Dashboard →
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Step Progress & Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-500/25 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 shadow-sm">
            <SparklesIcon className="size-3.5" />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">
              STEP 2 OF 2: CHOOSE YOUR PLAN
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Select a plan for your workspace
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base font-medium">
            All plans include a <span className="font-bold text-indigo-600 dark:text-indigo-400">14-day free trial</span>. No credit card required to start.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="pt-2 flex items-center justify-center gap-3">
            <div className="p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-800 inline-flex items-center gap-1 border border-slate-300/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === "monthly"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === "annual"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>Annual Billing</span>
                <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/20">
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Starter Plan */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-lg shadow-slate-200/50 dark:shadow-none hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <CardHeader className="p-0 space-y-4">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Starter</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1 min-h-[32px]">
                  Essential inventory tracking for single-branch stores
                </CardDescription>
              </div>
              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {billingCycle === "annual" ? "LKR 1,990" : "LKR 2,490"}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">/ month</span>
              </div>
            </CardHeader>

            <CardContent className="p-0 pt-6 space-y-6 flex-1 flex flex-col justify-between">
              <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <li className="flex items-center gap-2.5">
                  <CheckIcon className="size-4 text-emerald-500 shrink-0" />
                  <span>Up to 500 Active SKUs</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckIcon className="size-4 text-emerald-500 shrink-0" />
                  <span>Single Store Location</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckIcon className="size-4 text-emerald-500 shrink-0" />
                  <span>Low Stock & Expiry Alerts</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckIcon className="size-4 text-emerald-500 shrink-0" />
                  <span>Manual Purchase Orders</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckIcon className="size-4 text-emerald-500 shrink-0" />
                  <span>2 Staff User Accounts</span>
                </li>
              </ul>

              <Button
                variant="outline"
                disabled={loadingPlan === "starter"}
                onClick={() => handleSelectPlan("starter")}
                className="w-full h-12 rounded-xl border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer"
              >
                {loadingPlan === "starter" ? <Loader2Icon className="size-4 animate-spin" /> : "Start Free Trial"}
              </Button>
            </CardContent>
          </Card>

          {/* Growth Plan (Most Popular Highlighted) */}
          <Card className="bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-500/80 rounded-3xl p-6 flex flex-col justify-between shadow-2xl shadow-indigo-600/15 relative overflow-visible scale-105 z-10">
            {/* Top Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
              <Badge className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-0 text-[10px] font-extrabold px-3.5 py-1 uppercase tracking-wider shadow-md shadow-indigo-600/30">
                MOST POPULAR
              </Badge>
            </div>

            <CardHeader className="p-0 space-y-4 pt-2">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Growth</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300 text-xs mt-1 min-h-[32px]">
                  Full AI demand forecasting & automated reorders
                </CardDescription>
              </div>
              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                  {billingCycle === "annual" ? "LKR 3,900" : "LKR 4,900"}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">/ month</span>
              </div>
            </CardHeader>

            <CardContent className="p-0 pt-6 space-y-6 flex-1 flex flex-col justify-between">
              <ul className="space-y-3.5 text-xs text-slate-800 dark:text-slate-200 font-semibold">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2Icon className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Unlimited Products & SKUs</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2Icon className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>AI Demand Forecasting Engine</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2Icon className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Automated Reorder Suggestions</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2Icon className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Dynamic AI Pricing Engine</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2Icon className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Priority 24/7 Support & Email Alerts</span>
                </li>
              </ul>

              <Button
                disabled={loadingPlan === "growth"}
                onClick={() => handleSelectPlan("growth")}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                {loadingPlan === "growth" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <>
                    Start 14-Day Free Trial <ArrowRightIcon className="size-4 ml-1" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-lg shadow-slate-200/50 dark:shadow-none hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <CardHeader className="p-0 space-y-4">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Enterprise</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1 min-h-[32px]">
                  Multi-branch supermarket chains & franchise networks
                </CardDescription>
              </div>
              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">Custom</span>
              </div>
            </CardHeader>

            <CardContent className="p-0 pt-6 space-y-6 flex-1 flex flex-col justify-between">
              <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <li className="flex items-center gap-2.5">
                  <CheckIcon className="size-4 text-emerald-500 shrink-0" />
                  <span>Multi-Location Store Sync</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckIcon className="size-4 text-emerald-500 shrink-0" />
                  <span>Custom POS API Integrations</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckIcon className="size-4 text-emerald-500 shrink-0" />
                  <span>Dedicated Neural Model Tuning</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckIcon className="size-4 text-emerald-500 shrink-0" />
                  <span>Dedicated Account Manager & SLA</span>
                </li>
              </ul>

              <Button
                variant="outline"
                disabled={loadingPlan === "enterprise"}
                onClick={() => handleSelectPlan("enterprise")}
                className="w-full h-12 rounded-xl border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer"
              >
                Contact Enterprise Sales
              </Button>
            </CardContent>
          </Card>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60">
        © 2026 RetailMind AI. All rights reserved. 256-bit SSL encrypted.
      </footer>
    </div>
  );
}
