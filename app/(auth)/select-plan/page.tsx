"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  CreditCardIcon,
  Loader2Icon,
  GiftIcon,
  ZapIcon,
  BuildingIcon,
  RocketIcon,
  LockIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

type Plan = "STARTER" | "GROWTH";

export default function SelectPlanPage() {
  const router = useRouter();
  const { token } = useAuth();
  const activateTrialMutation = useMutation(api.organizations.activateFreeTrial);
  const activateSubMutation = useMutation(api.organizations.activateSubscription);

  const [trialLoading, setTrialLoading] = useState<Plan | null>(null);
  const [stripeLoading, setStripeLoading] = useState<Plan | null>(null);
  const [starterLoading, setStarterLoading] = useState(false);

  // ── Activate Free Trial ─────────────────────────────
  const handleStartTrial = async (plan: Plan) => {
    setTrialLoading(plan);
    try {
      await activateTrialMutation({ token: token ?? undefined, selectedPlan: plan });
      toast.success(
        `🎉 14-day ${plan === "GROWTH" ? "Growth" : "Starter"} trial activated! Explore freely.`,
        { duration: 4000 }
      );
      router.replace("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Could not activate trial. Please try again.");
    } finally {
      setTrialLoading(null);
    }
  };

  // ── Activate Starter (Free Forever) ────────────────
  const handleActivateStarter = async () => {
    setStarterLoading(true);
    try {
      await activateSubMutation({ token: token ?? undefined, plan: "starter" });
      toast.success("Starter Plan activated! Up to 100 SKUs enabled.");
      router.replace("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Failed to activate Starter plan.");
    } finally {
      setStarterLoading(false);
    }
  };

  // ── Stripe Checkout ─────────────────────────────────
  const handleStripeCheckout = async (plan: Plan) => {
    setStripeLoading(plan);
    try {
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      toast.error(data.error || "Could not initiate Stripe checkout. Please try again.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setStripeLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 dark:from-slate-950 dark:via-indigo-950/20 dark:to-slate-950 flex flex-col">
      {/* Top Navbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-30">
        <Logo size="sm" href="/" layout="horizontal" />
        <div className="flex items-center gap-4">
          <ModeToggle />
          <Button
            variant="ghost"
            onClick={() => router.replace("/dashboard")}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            Skip for now →
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">

        {/* Hero Header */}
        <div className="text-center space-y-5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/70 dark:to-violet-950/70 border border-indigo-200/60 dark:border-indigo-700/50 shadow-sm">
            <RocketIcon className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
              Step 2 of 2 · Choose Your Plan
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            Start Free,{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Upgrade Anytime
            </span>
          </h1>

          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base font-medium max-w-xl mx-auto">
            Every plan includes a <strong className="text-slate-700 dark:text-slate-200">14-day free trial</strong> — no credit card required.
            Pay only when you're ready.
          </p>

          {/* Trial Badge */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
            <GiftIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              14 days free · No credit card · Cancel anytime
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">

          {/* ── Starter Card ── */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-lg shadow-slate-200/40 dark:shadow-none hover:shadow-xl hover:shadow-slate-200/60 dark:hover:border-slate-700 transition-all duration-300 flex flex-col">
            <CardHeader className="p-6 pb-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <BuildingIcon className="size-5 text-slate-600 dark:text-slate-400" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold text-slate-500 border-slate-300 dark:border-slate-700">
                  FREE
                </Badge>
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Starter</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Essential inventory tracking for single-branch stores
                </CardDescription>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">Free</span>
                <span className="text-slate-400 text-xs font-semibold">forever</span>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-2 space-y-6 flex-1 flex flex-col justify-between">
              <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                {[
                  "Up to 100 Active SKUs",
                  "Single Store Location",
                  "Low Stock & Expiry Alerts",
                  "Manual Purchase Orders",
                  "2 Staff User Accounts",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <CheckIcon className="size-4 text-emerald-500 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-2.5 pt-2">
                {/* Trial CTA */}
                <Button
                  variant="outline"
                  disabled={!!trialLoading || !!stripeLoading || starterLoading}
                  onClick={() => handleStartTrial("STARTER")}
                  className="w-full h-11 rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  {trialLoading === "STARTER" ? (
                    <><Loader2Icon className="size-3.5 animate-spin" /> Activating trial...</>
                  ) : (
                    <><GiftIcon className="size-3.5 text-emerald-500" /> Start 14-Day Free Trial</>
                  )}
                </Button>

                {/* Activate Free Button */}
                <Button
                  disabled={!!trialLoading || !!stripeLoading || starterLoading}
                  onClick={handleActivateStarter}
                  className="w-full h-11 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-700 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs gap-2 transition-all"
                >
                  {starterLoading ? (
                    <><Loader2Icon className="size-3.5 animate-spin" /> Activating...</>
                  ) : (
                    <><CheckCircle2Icon className="size-3.5" /> Activate Starter — Free Forever</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Growth Card (highlighted) ── */}
          <Card className="bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-500 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-600/20 relative md:-mt-4 md:-mb-4 z-10 flex flex-col">
            {/* Popular badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
              <Badge className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-0 text-[10px] font-extrabold px-4 py-1 uppercase tracking-widest shadow-lg shadow-indigo-600/30">
                Most Popular
              </Badge>
            </div>

            <CardHeader className="p-6 pb-4 pt-8 space-y-4 bg-gradient-to-br from-indigo-50/60 to-violet-50/40 dark:from-indigo-950/30 dark:to-violet-950/20">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-600/30">
                  <ZapIcon className="size-5 text-white" />
                </div>
                <Badge className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700 text-[10px] font-bold">
                  AI-POWERED
                </Badge>
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Growth</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300 text-xs mt-1">
                  Full AI demand forecasting & automated reorders
                </CardDescription>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">LKR 4,900</span>
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">/ month</span>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-4 space-y-6 flex-1 flex flex-col justify-between">
              <ul className="space-y-3.5 text-xs text-slate-700 dark:text-slate-200 font-semibold">
                {[
                  "Unlimited Products & SKUs",
                  "AI Demand Forecasting Engine",
                  "Automated Reorder Suggestions",
                  "Dynamic AI Pricing Engine",
                  "Multi-Location Stock Sync",
                  "Priority 24/7 Support & Email Alerts",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <CheckCircle2Icon className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-2.5 pt-2">
                {/* Primary: Trial CTA */}
                <Button
                  disabled={!!trialLoading || !!stripeLoading || starterLoading}
                  onClick={() => handleStartTrial("GROWTH")}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 gap-2 transition-all"
                >
                  {trialLoading === "GROWTH" ? (
                    <><Loader2Icon className="size-4 animate-spin" /> Activating trial...</>
                  ) : (
                    <><GiftIcon className="size-4" /> Start 14-Day Free Trial <ArrowRightIcon className="size-3.5 ml-1" /></>
                  )}
                </Button>

                {/* Secondary: Direct Pay */}
                <Button
                  variant="outline"
                  disabled={!!trialLoading || !!stripeLoading || starterLoading}
                  onClick={() => handleStripeCheckout("GROWTH")}
                  className="w-full h-11 rounded-xl border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-bold text-xs gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all"
                >
                  {stripeLoading === "GROWTH" ? (
                    <><Loader2Icon className="size-3.5 animate-spin" /> Redirecting to Stripe...</>
                  ) : (
                    <><CreditCardIcon className="size-3.5" /> Pay Now & Subscribe</>
                  )}
                </Button>
              </div>

              <p className="text-[10px] text-center text-slate-400 flex items-center justify-center gap-1 pt-1">
                <LockIcon className="size-3 text-emerald-500" />
                Secure 256-bit SSL · Cancel anytime
              </p>
            </CardContent>
          </Card>

          {/* ── Enterprise Card ── */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-lg shadow-slate-200/40 dark:shadow-none hover:shadow-xl hover:shadow-slate-200/60 dark:hover:border-slate-700 transition-all duration-300 flex flex-col">
            <CardHeader className="p-6 pb-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/30">
                  <SparklesIcon className="size-5 text-white" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                  CUSTOM
                </Badge>
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Enterprise</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Multi-branch chains & franchise networks
                </CardDescription>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">Custom</span>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-2 space-y-6 flex-1 flex flex-col justify-between">
              <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                {[
                  "Everything in Growth",
                  "Multi-Location Store Sync",
                  "Custom POS API Integrations",
                  "Dedicated Neural Model Tuning",
                  "Dedicated Account Manager & SLA",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <CheckIcon className="size-4 text-amber-500 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-2.5 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    window.location.href =
                      "mailto:sales@retailmind.ai?subject=RetailMind%20Enterprise%20Plan%20Inquiry";
                  }}
                  className="w-full h-11 rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Contact Enterprise Sales
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reassurance row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            { icon: GiftIcon, label: "14-day free trial", desc: "No credit card required to start" },
            { icon: LockIcon, label: "256-bit SSL secure", desc: "Bank-grade payment encryption" },
            { icon: CheckCircle2Icon, label: "Cancel anytime", desc: "No long-term contracts or lock-in" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                <Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{label}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200/60 dark:border-slate-800/60">
        © 2026 RetailMind AI · 256-bit SSL encrypted · All rights reserved
      </footer>
    </div>
  );
}
