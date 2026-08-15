"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  CreditCard,
  CheckCircle2,
  Zap,
  Sparkles,
  Shield,
  Clock,
  Crown,
  ExternalLink,
  Loader2,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export default function BillingPage() {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [vipLoadingId, setVipLoadingId] = useState<string | null>(null);

  const { token, currentUser } = useAuth();
  const subData = useQuery(api.subscriptions.getUserSubscription, { token: token ?? undefined });

  // Admin mutation
  const grantVip = useMutation(api.subscriptions.grantVipAccess);
  const cancelSub = useMutation(api.subscriptions.cancelSubscriptionAtPeriodEnd);

  const plan = subData?.userPlan || "starter";
  const isVip = subData?.isVipAccess || currentUser?.role === "admin" || false;
  const subscription: any = subData?.organization;

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
        toast.error("Failed to redirect to Stripe. Directing to plan selection page...");
        window.location.href = "/select-plan";
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to initiate checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setPortalLoading(true);
      const res = await fetch("/api/billing/create-portal-session", {
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
      toast.error(err?.message || "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
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
        toast.error("Could not open billing portal.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to launch Stripe Portal.");
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

  const handleToggleVip = async (targetUserId: string, currentVip: boolean) => {
    try {
      setVipLoadingId(targetUserId);
      const res = await grantVip({
        targetUserId,
        isVipAccess: !currentVip,
        grantedPlan: !currentVip ? "enterprise" : undefined,
      });
      toast.success("VIP status updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update VIP status.");
    } finally {
      setVipLoadingId(null);
    }
  };

  const periodEndFormatted = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

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
            Manage your RetailMind AI plan, invoices, payment methods, and account permissions.
          </p>
        </div>

        {plan === "starter" && !isVip && (
          <Button
            onClick={handleUpgrade}
            disabled={checkoutLoading}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-indigo-600/30 px-6 rounded-xl"
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
                  {isVip ? "Enterprise (Admin VIP)" : `${plan} Plan`}
                </h2>
                <Badge
                  className={
                    isVip || plan === "growth" || plan === "enterprise"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-3 py-1"
                      : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30 px-3 py-1"
                  }
                >
                  {isVip
                    ? "VIP Unlimited"
                    : subscription?.status === "active"
                    ? "Active"
                    : subscription?.status === "past_due"
                    ? "Past Due"
                    : "Starter Free"}
                </Badge>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Price
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {plan === "growth"
                  ? "LKR 4,900 / mo"
                  : plan === "enterprise" || isVip
                  ? "Custom / VIP"
                  : "LKR 0 (Free)"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
              <Clock className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500">Next Billing Date</p>
                <p className="font-semibold text-slate-900 dark:text-slate-200">
                  {periodEndFormatted}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
              <Shield className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-500">Product Limit</p>
                <p className="font-semibold text-slate-900 dark:text-slate-200">
                  {isVip || plan !== "starter" ? "Unlimited Products" : "Up to 100 Products"}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-wrap items-center gap-3">
            <Button
              onClick={handleOpenPortal}
              disabled={portalLoading}
              variant="outline"
              className="border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl"
            >
              {portalLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Stripe Customer Portal
            </Button>

            {plan === "growth" && subscription && !subscription.cancelAtPeriodEnd && (
              <Button
                onClick={handleCancelAtPeriodEnd}
                variant="ghost"
                className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-xs"
              >
                Cancel Subscription at Period End
              </Button>
            )}
          </div>
        </Card>

        {/* Feature Overview Card */}
        <Card className="bg-gradient-to-br from-indigo-900/90 to-slate-900 border-indigo-500/30 rounded-xl p-6 text-white shadow-lg space-y-4">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-indigo-400" /> Plan Features
          </div>
          <h3 className="text-lg font-bold font-heading">
            {isVip || plan !== "starter" ? "Full Growth Unlocked" : "Starter Features"}
          </h3>
          <ul className="space-y-3 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              Real-time Stock Discrepancy Tracking
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              AI SKU Demand Forecasting ({plan !== "starter" || isVip ? "Enabled" : "Upgrade"})
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              Automated Purchase Orders ({plan !== "starter" || isVip ? "Enabled" : "Upgrade"})
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              Dynamic Margin Pricing Engine ({plan !== "starter" || isVip ? "Enabled" : "Upgrade"})
            </li>
          </ul>
        </Card>
      </div>

      {/* Admin VIP / Unlimited Access Management Section */}
      {currentUser?.role === "admin" && (
        <Card className="bg-white dark:bg-slate-900 border-indigo-500/30 rounded-xl p-6 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Admin VIP Unlimited Access Override
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                As an Administrator, you can grant complimentary unlimited access (Growth/Enterprise) to any favored user.
              </p>
            </div>
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 px-3 py-1">
              Admin Privilege
            </Badge>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                {currentUser.name} ({currentUser.email})
              </p>
              <p className="text-xs text-slate-500">Role: {currentUser.role.toUpperCase()}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                Full Admin VIP Access
              </Badge>
              <Button
                onClick={() => handleToggleVip(currentUser.id, isVip)}
                disabled={vipLoadingId === currentUser.id}
                size="sm"
                variant={isVip ? "destructive" : "default"}
                className="rounded-xl text-xs"
              >
                {vipLoadingId === currentUser.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isVip ? (
                  <>
                    <UserX className="w-3.5 h-3.5 mr-1" /> Revoke VIP
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 mr-1" /> Grant VIP Access
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
