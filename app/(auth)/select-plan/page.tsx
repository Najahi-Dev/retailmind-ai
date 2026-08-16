"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { PricingSection } from "@/components/pricing-section";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function SelectPlanPage() {
  const router = useRouter();
  const { currentUser, token } = useAuth();

  const activateTrial = useMutation(api.organizations.activateFreeTrial);

  const handleStartTrial = async (plan: "STARTER" | "GROWTH") => {
    try {
      await activateTrial({
        token: token ?? undefined,
        selectedPlan: plan.toLowerCase() as "starter" | "growth",
      });
      toast.success(`${plan === "GROWTH" ? "Growth" : "Starter"} 14-day free trial activated!`);
      router.replace("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Failed to start trial");
    }
  };

  const handlePaySubscribe = async (plan: "STARTER" | "GROWTH") => {
    try {
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.toLowerCase() }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data?.error || "Failed to create checkout session");
    } catch (err: any) {
      toast.error(err?.message || "Failed to initiate payment");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col justify-between transition-colors">
      {/* Top Navbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md sticky top-0 z-40">
        <Logo size="sm" href="/" layout="horizontal" />
        <div className="flex items-center gap-4">
          <ModeToggle />
          {currentUser ? (
            <Button variant="ghost" asChild className="text-xs font-semibold">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <Button variant="ghost" asChild className="text-xs font-semibold">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Main Pricing Section */}
      <main className="flex-1 flex flex-col items-center justify-center">
        <PricingSection
          onSelectTrial={handleStartTrial}
          onSubscribeStripe={handlePaySubscribe}
          className="py-12 sm:py-16"
        />
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 dark:text-zinc-400 border-t border-slate-200/60 dark:border-zinc-800/60">
        © 2026 RetailMind AI. All rights reserved. 14-day risk-free trial. Cancel anytime.
      </footer>
    </div>
  );
}