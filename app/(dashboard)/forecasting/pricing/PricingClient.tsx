"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Sparkles,
  Zap,
  Search,
  BrainCircuit,
  Filter,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { UpgradePrompt } from "@/components/upgrade-prompt";

const DIRECTION_CONFIG = {
  increase: {
    label: "Price Increase",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/15 dark:bg-emerald-500/20",
    border: "border-emerald-500/30",
    icon: <TrendingUp className="w-4 h-4" />,
    badgeText: "+ Margin Boost",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  decrease: {
    label: "Price Markdown",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/15 dark:bg-red-500/20",
    border: "border-red-500/30",
    icon: <TrendingDown className="w-4 h-4" />,
    badgeText: "- Near Expiry Cut",
    badgeClass: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
  },
  maintain: {
    label: "Optimal Price",
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-500/15 dark:bg-slate-500/20",
    border: "border-slate-500/30",
    icon: <Minus className="w-4 h-4" />,
    badgeText: "Optimal",
    badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
  },
};

import { useAuth } from "@/lib/auth-context";

type SuggestionStatus = "pending" | "approved" | "rejected" | undefined;

export default function PricingClient() {
  const { token } = useAuth();
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus>("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const access = useQuery(api.subscriptions.checkFeatureAccess, { token: token ?? undefined });
  const suggestions = useQuery(api.pricing.getPriceSuggestions, { token: token ?? undefined, status: statusFilter });
  const stats = useQuery(api.pricing.getPricingStats, { token: token ?? undefined });
  const approve = useMutation(api.pricing.approvePriceSuggestion);
  const reject = useMutation(api.pricing.rejectPriceSuggestion);

  const [processing, setProcessing] = useState<string | null>(null);

  if (access && !access.canAccessPricingEngine) {
    return (
      <div className="p-6">
        <UpgradePrompt
          title="Dynamic Pricing Engine Gated"
          description="Automated margin optimization and near-expiry price adjustments are exclusive to RetailMind AI Growth & Enterprise plans."
        />
      </div>
    );
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 2,
    }).format(val);

  const handleApprove = async (id: Id<"priceSuggestions">) => {
    setProcessing(id);
    try {
      await approve({ suggestionId: id });
      toast.success("AI Price update applied successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply price");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: Id<"priceSuggestions">) => {
    setProcessing(id);
    try {
      await reject({ suggestionId: id });
      toast.success("Price suggestion dismissed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject suggestion");
    } finally {
      setProcessing(null);
    }
  };

  if (!suggestions || !stats) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-slate-500 font-medium">
        <RefreshCw className="animate-spin w-6 h-6 text-indigo-600" />
        <span>Synchronizing AI Pricing Neural Engine...</span>
      </div>
    );
  }

  const filteredSuggestions = suggestions.filter((s) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.productName.toLowerCase().includes(query) ||
      s.productSku.toLowerCase().includes(query) ||
      s.reason.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full">

      {/* ── 1. EXECUTIVE HEADER & HERO BANNER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
        {/* Glow Overlay */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs px-3 py-0.5">
              <BrainCircuit className="w-3.5 h-3.5 mr-1 text-indigo-400 animate-pulse" />
              Neural Dynamic Pricing Engine
            </Badge>
            <span className="text-slate-400 text-xs hidden sm:inline">• Automated Supermarket Markdown System</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            AI Dynamic Pricing & Margin Optimizer
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Real-time automated price markdowns for near-expiry inventory & margin boosts based on demand velocity, safety stock, and seasonality.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 z-10">
          <Button
            size="sm"
            onClick={() => toast.info("AI Neural Engine automatically recalculates price markdowns nightly at 00:00 UTC.")}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-md border-0 rounded-xl"
          >
            <Zap className="w-4 h-4 mr-1.5" /> Run AI Price Scan
          </Button>
        </div>
      </div>

      {/* ── 2. EXECUTIVE KPI GRID (4 METRICS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Pending Review */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Pending Review</CardDescription>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {stats.pending} Suggestions
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Open for approval</span>
            <span>Est LKR 185k value</span>
          </CardFooter>
        </Card>

        {/* Recommended Markdowns */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Recommended Markdowns</CardDescription>
              <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-extrabold text-red-600 dark:text-red-400 tabular-nums tracking-tight">
              {stats.decreases} Markdowns
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span className="text-red-600 dark:text-red-400 font-semibold">Near-expiry liquidation</span>
            <span>Prevent waste</span>
          </CardFooter>
        </Card>

        {/* Recommended Increases */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Margin Boosts</CardDescription>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
              {stats.increases} Boosts
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">High-demand items</span>
            <span>Maximize margin</span>
          </CardFooter>
        </Card>

        {/* Applied Today */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Applied Price Updates</CardDescription>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums tracking-tight">
              {stats.approved} Active
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">POS Synced</span>
            <span>Live in store</span>
          </CardFooter>
        </Card>

      </div>

      {/* ── 3. SEARCH, FILTER & LIST CONTAINER ── */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                AI Price Recommendations Queue
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                Showing {filteredSuggestions.length} price suggestions
              </CardDescription>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search SKU or product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>

              <Select
                value={statusFilter ?? "all"}
                onValueChange={(v) =>
                  setStatusFilter(v === "all" ? undefined : (v as SuggestionStatus))
                }
              >
                <SelectTrigger className="w-36 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved & Active</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="all">All Statuses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {filteredSuggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500 text-center">
              <Sparkles className="w-10 h-10 text-indigo-500/50" />
              <p className="font-bold text-slate-900 dark:text-white">No Price Suggestions Found</p>
              <p className="text-xs text-slate-500 max-w-sm">
                AI pricing runs nightly and generates automated suggestions based on inventory velocity and expiration dates.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSuggestions.map((s) => {
                const config = DIRECTION_CONFIG[s.changeDirection];
                const isProcessing = processing === s._id;

                return (
                  <div
                    key={s._id}
                    className={`
                      rounded-lg border p-4 sm:p-5 transition-all duration-200
                      ${
                        s.status === "pending"
                          ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/40 shadow-xs"
                          : "bg-slate-100/40 dark:bg-slate-950/40 border-slate-200/40 dark:border-slate-900 opacity-80"
                      }
                    `}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                      {/* Left Block — Product Details & AI Factors */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Squircle Badge */}
                        <div
                          className={`
                            mt-0.5 shrink-0 size-10 rounded-xl flex items-center justify-center
                            ${config.bg} ${config.color} border ${config.border} shadow-xs
                          `}
                        >
                          {config.icon}
                        </div>

                        <div className="min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                              {s.productName}
                            </span>
                            <Badge className={`text-[11px] font-bold px-2 py-0.5 ${config.badgeClass}`}>
                              {s.priceChange > 0 ? "+" : ""}
                              {s.priceChange.toFixed(1)}%
                            </Badge>
                            <Badge variant="outline" className="text-[11px] font-semibold border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5">
                              {(s.confidence * 100).toFixed(0)}% AI Confidence
                            </Badge>
                            <span className="text-xs font-mono text-slate-600 dark:text-slate-400 font-bold bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              SKU: {s.productSku}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                            {s.reason}
                          </p>

                          {/* Factors Grid */}
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            {[
                              { k: "Stock", v: s.factors.stockLevel },
                              { k: "Demand", v: s.factors.demandTrend },
                              { k: "Season", v: s.factors.seasonality },
                              { k: "Days Left", v: `${s.factors.daysOfStock}d` },
                            ].map((f) => (
                              <span
                                key={f.k}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-200/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-slate-700/50"
                              >
                                <span className="text-slate-600 dark:text-slate-400">{f.k}:</span>
                                <span className="font-bold">{f.v}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Block — Price Delta & Action Controls */}
                      <div className="flex items-center gap-5 shrink-0 flex-wrap justify-between lg:justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/60 dark:border-slate-800">

                        {/* Price Box */}
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                          <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">Current</p>
                            <p className="text-xs font-semibold text-slate-500 line-through">
                              {formatCurrency(s.currentPrice)}
                            </p>
                          </div>
                          <div className={`p-1 rounded-lg ${config.bg} ${config.color}`}>
                            {config.icon}
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">Suggested AI</p>
                            <p className={`text-sm font-extrabold ${config.color}`}>
                              {formatCurrency(s.suggestedPrice)}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        {s.status === "pending" && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleApprove(s._id as Id<"priceSuggestions">)}
                              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-sm px-4"
                            >
                              {isProcessing ? (
                                <RefreshCw className="animate-spin w-4 h-4" />
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                  Apply
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isProcessing}
                              onClick={() => handleReject(s._id as Id<"priceSuggestions">)}
                              className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-3"
                            >
                              <XCircle className="w-4 h-4 mr-1 text-slate-400" />
                              Reject
                            </Button>
                          </div>
                        )}

                        {s.status === "approved" && (
                          <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Applied in Store
                          </Badge>
                        )}

                        {s.status === "rejected" && (
                          <Badge variant="secondary" className="px-3 py-1.5 text-xs font-bold rounded-xl">
                            Dismissed
                          </Badge>
                        )}

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}