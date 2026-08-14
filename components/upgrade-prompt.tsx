"use client";

import React, { useState } from "react";
import { Lock, Sparkles, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { toast } from "sonner";

interface UpgradePromptProps {
  title?: string;
  description?: string;
  featureName?: string;
}

export function UpgradePrompt({
  title = "Unlock AI Intelligence Features",
  description = "AI Demand Forecasting, Automated PO Suggestions, and the Dynamic Pricing Engine are exclusive to the RetailMind AI Growth Plan.",
  featureName = "this feature",
}: UpgradePromptProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "growth" }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to initialize checkout. Redirecting to pricing page...");
        window.location.href = "/#pricing";
      }
    } catch (err) {
      console.error(err);
      toast.error("Error opening checkout.");
      window.location.href = "/#pricing";
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full my-8 p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-violet-950/80 border border-indigo-500/30 text-white shadow-2xl relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Growth & Enterprise Feature</span>
        </div>

        <h2 className="font-heading text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          {title}
        </h2>

        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
          {description}
        </p>

        <div className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-lg mx-auto bg-slate-950/50 p-6 rounded-2xl border border-slate-800/80">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>AI Demand Forecasting (SKU Level)</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Automated Purchase Orders</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Dynamic Margin Pricing Engine</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Unlimited Products & Stores</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Button
            onClick={handleUpgrade}
            disabled={loading}
            size="lg"
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold shadow-xl shadow-indigo-600/40 px-8 h-12 rounded-xl text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Connecting to Checkout...
              </>
            ) : (
              <>
                Upgrade to Growth Plan (LKR 4,900/mo) <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto border-slate-700 text-slate-300 hover:bg-slate-800 text-sm h-12 rounded-xl"
          >
            <Link href="/#pricing">View Plan Comparison</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
