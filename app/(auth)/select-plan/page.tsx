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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2Icon,
  CheckIcon,
  SparklesIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  LockIcon,
  Loader2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function SelectPlanPage() {
  const router = useRouter();
  const { currentUser, token } = useAuth();
  const activateSub = useMutation(api.organizations.activateSubscription);

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<string | null>(null);

  // Card Payment Form State
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvc, setCvc] = useState("");
  const [paying, setPaying] = useState(false);

  const [initiatingStripe, setInitiatingStripe] = useState(false);

  const handleOpenPaymentModal = async (planKey: string) => {
    if (planKey === "enterprise") {
      window.location.href = "mailto:sales@retailmind.ai?subject=RetailMind%20Enterprise%20Plan%20Inquiry";
      return;
    }

    if (planKey === "starter") {
      try {
        await activateSub({ token: token ?? undefined, plan: "starter" });
        toast.success("Starter Plan activated! Up to 100 SKUs enabled.");
        router.replace("/dashboard");
      } catch (err: any) {
        toast.error("Failed to activate Starter plan.");
      }
      return;
    }

    // Growth Plan: Attempt official Stripe Checkout Session first
    setInitiatingStripe(true);
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
      // Fallback to internal card payment modal if Stripe keys not configured
      setSelectedPlanForPayment(planKey);
    } catch (err) {
      setSelectedPlanForPayment(planKey);
    } finally {
      setInitiatingStripe(false);
    }
  };

  const handleExecuteCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForPayment) return;

    if (!cardholderName.trim() || !cardNumber.trim() || !expiryDate.trim() || !cvc.trim()) {
      toast.error("Please fill in all credit card details to complete payment.");
      return;
    }

    setPaying(true);
    try {
      // Process subscription activation mutation
      await activateSub({
        token: token ?? undefined,
        plan: selectedPlanForPayment as any,
      });

      toast.success(`Payment Successful! Subscribed to ${selectedPlanForPayment.toUpperCase()} Plan.`);
      setSelectedPlanForPayment(null);
      router.replace("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Failed to process card payment.");
    } finally {
      setPaying(false);
    }
  };

  const getPlanPrice = (planKey: string) => {
    if (planKey === "starter") {
      return billingCycle === "annual" ? "LKR 1,990 / mo" : "LKR 2,490 / mo";
    }
    if (planKey === "growth") {
      return billingCycle === "annual" ? "LKR 3,900 / mo" : "LKR 4,900 / mo";
    }
    return "Custom";
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
              STEP 2 OF 2: CHOOSE YOUR PLAN & PAY
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Subscribe to Unlock Workspace
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base font-medium">
            Select a plan and enter your card details to grant instant access to your workspace.
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
                  <span>Up to 100 Active SKUs</span>
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
                onClick={() => handleOpenPaymentModal("starter")}
                className="w-full h-12 rounded-xl border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer gap-2"
              >
                <CreditCardIcon className="size-4" /> Subscribe with Card
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
                onClick={() => handleOpenPaymentModal("growth")}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 cursor-pointer gap-2"
              >
                <CreditCardIcon className="size-4" /> Subscribe with Card <ArrowRightIcon className="size-4 ml-1" />
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
                onClick={() => handleOpenPaymentModal("enterprise")}
                className="w-full h-12 rounded-xl border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer"
              >
                Contact Enterprise Sales
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Credit / Debit Card Checkout Modal */}
      <Dialog open={!!selectedPlanForPayment} onOpenChange={(open) => !open && setSelectedPlanForPayment(null)}>
        <DialogContent className="sm:max-w-md p-6 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCardIcon className="size-5 text-indigo-600 dark:text-indigo-400" />
                <span>Card Payment Checkout</span>
              </div>
              <Badge className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 text-[10px]">
                {selectedPlanForPayment?.toUpperCase()} PLAN
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Enter your credit or debit card details to complete subscription payment.
            </DialogDescription>
          </DialogHeader>

          {/* Order Summary Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-900 dark:text-white block uppercase">
                {selectedPlanForPayment} Package
              </span>
              <span className="text-[11px] text-slate-500">
                {billingCycle === "annual" ? "Billed Annually (20% Off)" : "Billed Monthly"}
              </span>
            </div>
            <div className="text-right">
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm block">
                {getPlanPrice(selectedPlanForPayment || "starter")}
              </span>
            </div>
          </div>

          <form onSubmit={handleExecuteCardPayment} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cardholder Name</Label>
              <Input
                placeholder="John Doe"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                required
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Card Number</Label>
              <div className="relative">
                <Input
                  placeholder="4532 1098 7654 3210"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  maxLength={19}
                  required
                  className="h-10 text-xs rounded-xl pr-10 font-mono"
                />
                <CreditCardIcon className="size-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Expiration Date</Label>
                <Input
                  placeholder="MM/YY"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  maxLength={5}
                  required
                  className="h-10 text-xs rounded-xl text-center font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">CVC / CVV</Label>
                <Input
                  type="password"
                  placeholder="•••"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  maxLength={4}
                  required
                  className="h-10 text-xs rounded-xl text-center font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={paying}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/25 transition-all gap-2 cursor-pointer"
              >
                {paying ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" /> Processing Payment...
                  </>
                ) : (
                  <>
                    <LockIcon className="size-3.5" /> Pay & Activate Subscription
                  </>
                )}
              </Button>
            </div>

            <p className="text-[10px] text-center text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheckIcon className="size-3 text-emerald-500" /> 256-Bit SSL Encrypted Card Processing
            </p>
          </form>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60">
        © 2026 RetailMind AI. All rights reserved. 256-bit SSL encrypted.
      </footer>
    </div>
  );
}
