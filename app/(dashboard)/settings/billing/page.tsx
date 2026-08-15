"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  CreditCard,
  CheckCircle2,
  Zap,
  Sparkles,
  Shield,
  Clock,
  ExternalLink,
  Loader2,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useWorkspaceBilling } from "@/hooks/useWorkspaceBilling";
import Link from "next/link";

export default function BillingPage() {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { currentUser } = useAuth();
  const {
    organization,
    tier,
    planConfig,
    isSubscribed,
    isTrialExpired,
    daysRemaining,
    trialEndsFormatted,
    nextBillingFormatted,
    isAdmin,
  } = useWorkspaceBilling();

  const cancelSub = useMutation(api.subscriptions.cancelSubscriptionAtPeriodEnd);

  const handleSyncStripe = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/billing/sync-stripe", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Subscription status synchronized with Stripe!");
      } else {
        toast.error(data.error || "Failed to sync subscription.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to sync subscription.");
    } finally {
      setSyncing(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      setCheckoutLoading(true);
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.info("Directing to plan selection page...");
        window.location.href = "/select-plan";
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to initiate checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    try {
      setPortalLoading(true);
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data?.error || "Could not open Stripe Billing Portal.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to open Stripe Billing Portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelAtPeriodEnd = async () => {
    if (!currentUser?.id) return;
    try {
      await cancelSub({ userId: currentUser.id });
      toast.success("Subscription set to cancel at period end.");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel subscription.");
    }
  };

  return (
    <div className="space-y-5 p-3 sm:p-4 lg:p-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-slate-900 dark:text-white flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            Subscription & Billing
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            {isAdmin
              ? "Manage your workspace plan, invoices, Stripe payment methods, and member permissions."
              : "View your workspace's active subscription tier, inherited capabilities, and feature status."}
          </p>
        </div>

        {isAdmin && !isSubscribed && (
          <Button
            onClick={handleUpgrade}
            disabled={checkoutLoading}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-indigo-600/30 px-6 rounded-xl cursor-pointer"
          >
            {checkoutLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Upgrade to Growth
          </Button>
        )}
      </div>

      {!isAdmin && (
        <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-900 dark:text-indigo-200">
            <p className="font-bold mb-0.5">Workspace Plan Inheritance</p>
            <p className="leading-relaxed">
              Your account inherits all capabilities and features directly from the{" "}
              <strong>{planConfig.displayName}</strong> subscribed by your workspace. Only Workspace Administrators can alter billing methods, upgrade packages, or access invoices.
            </p>
          </div>
        </div>
      )}

      {/* Current Subscription Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Plan
              </span>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold font-heading text-slate-900 dark:text-white capitalize">
                  {planConfig.displayName}
                </h2>
                <Badge
                  className={
                    isSubscribed
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-3 py-1 font-bold"
                      : isTrialExpired
                      ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 px-3 py-1 font-bold"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 px-3 py-1 font-bold"
                  }
                >
                  {isSubscribed
                    ? "Active Subscription"
                    : isTrialExpired
                    ? "Trial Expired"
                    : `14-Day Free Trial (${daysRemaining}d left)`}
                </Badge>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Price
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {planConfig.price}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
              <Clock className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500">
                  {isSubscribed ? "Next Billing Date" : "Trial Expiration Date"}
                </p>
                <p className="font-semibold text-slate-900 dark:text-slate-200">
                  {isSubscribed
                    ? nextBillingFormatted
                    : daysRemaining > 0
                    ? `${trialEndsFormatted} (${daysRemaining}d left)`
                    : planConfig.billingCycle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
              <Package className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500">Product Limit</p>
                <p className="font-semibold text-slate-900 dark:text-slate-200">
                  {planConfig.skuLabel}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons (Admin Only) */}
          {isAdmin && (
            <div className="pt-4 flex flex-wrap items-center gap-3">
              {isSubscribed ? (
                <Button
                  onClick={handleOpenPortal}
                  disabled={portalLoading}
                  variant="outline"
                  className="border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl cursor-pointer"
                >
                  {portalLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  Stripe Customer Portal
                </Button>
              ) : (
                <Link href="/select-plan">
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm gap-1.5 cursor-pointer">
                    <Zap className="w-3.5 h-3.5" /> View Upgrade Options
                  </Button>
                </Link>
              )}

              {tier === "GROWTH" && organization && !(organization as any).cancelAtPeriodEnd && (
                <Button
                  onClick={handleCancelAtPeriodEnd}
                  variant="ghost"
                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-xs cursor-pointer"
                >
                  Cancel Subscription at Period End
                </Button>
              )}

              <Button
                onClick={handleSyncStripe}
                disabled={syncing}
                variant="outline"
                className="border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl cursor-pointer text-xs"
              >
                {syncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                )}
                Sync Stripe Status
              </Button>
            </div>
          )}
        </Card>

        {/* Feature Overview Card */}
        <Card className="bg-gradient-to-br from-indigo-900/90 to-slate-900 border-indigo-500/30 rounded-xl p-6 text-white shadow-lg space-y-4">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-indigo-400" /> Plan Features
          </div>
          <h3 className="text-lg font-bold font-heading">
            {planConfig.displayName} Capabilities
          </h3>
          <ul className="space-y-3 text-xs text-slate-300">
            {planConfig.features.map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
