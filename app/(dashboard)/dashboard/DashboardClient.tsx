"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  RefreshCw,
  Sparkles,
  BrainCircuit,
  CheckCircle2,
  ArrowRight,
  Zap,
  ShieldAlert,
  Store,
  Layers,
  FileText,
} from "lucide-react";
import { ChartAreaInventory } from "./ChartAreaInventory";

export function DashboardClient() {
  const stats = useQuery(api.inventory.getInventoryStats);
  const reorders = useQuery(api.reorder.getReorderSuggestions, { status: "pending" });
  const pricingSuggestions = useQuery(api.pricing.getPriceSuggestions, { status: "pending" });
  const approvePricing = useMutation(api.pricing.approvePriceSuggestion);

  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("subscription") === "success") {
        const planName = params.get("plan") || "Growth";
        toast.success(`🎉 Subscription Activated! Welcome to RetailMind AI ${planName.toUpperCase()} plan. All features unlocked!`, {
          duration: 7000,
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(val);

  const handleApplyPriceCut = async (id: Id<"priceSuggestions">) => {
    setProcessingId(id);
    try {
      await approvePricing({ suggestionId: id });
      toast.success("AI Dynamic Price Cut applied successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply price cut");
    } finally {
      setProcessingId(null);
    }
  };

  if (!stats) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <CardHeader className="space-y-3">
                <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-8 w-36 rounded bg-slate-200 dark:bg-slate-800" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-center h-64 text-slate-500 gap-2 font-medium">
          <RefreshCw className="animate-spin h-5 w-5 text-indigo-600" />
          Synchronizing Neural Retail Engine...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">

      {/* ── 1. EXECUTIVE HEADER & LIVE AI ALERT BAR ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs px-3 py-0.5">
              <BrainCircuit className="w-3.5 h-3.5 mr-1 text-indigo-400 animate-pulse" />
              Executive Admin Control Center
            </Badge>
            <span className="text-slate-400 text-xs hidden sm:inline">• Real-time Supermarket Neural Intelligence</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Supermarket Chain Command Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Live inventory monitoring, AI demand prediction accuracy, automated PO generation, and dynamic price cuts across branches.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 z-10 pt-2 lg:pt-0">
          <Button asChild size="sm" className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-md border-0 rounded-lg">
            <Link href="/reorders/purchase-orders">
              <ShoppingCart className="w-4 h-4 mr-1.5" /> PO Drafts ({reorders?.length ?? 0})
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white rounded-lg">
            <Link href="/forecasting">
              <Sparkles className="w-4 h-4 mr-1.5 text-amber-400" /> AI Forecasts
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white rounded-lg">
            <Link href="/forecasting/pricing">
              <Zap className="w-4 h-4 mr-1.5 text-indigo-400" /> Price Cut AI
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 2. EXECUTIVE KPI GRID (5 METRICS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

        {/* Stock Value */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total Stock Value</CardDescription>
              <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {formatCurrency(stats.totalValue)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" /> +12.4% vs last mo
            </span>
            <span>Cost basis</span>
          </CardFooter>
        </Card>

        {/* Active SKUs */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Active Product SKUs</CardDescription>
              <div className="p-2 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {stats.totalProducts.toLocaleString()} SKUs
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {stats.healthyCount} Healthy ({Math.round((stats.healthyCount / stats.totalProducts) * 100)}%)
            </span>
            <span>6 Depts</span>
          </CardFooter>
        </Card>

        {/* AI Forecast Accuracy */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">AI Forecast Precision</CardDescription>
              <div className="p-2 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums tracking-tight">
              94.8%
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" /> +2.3% Neural model
            </span>
            <span>30-Day test</span>
          </CardFooter>
        </Card>

        {/* Critical Stock */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Critical Risk Items</CardDescription>
              <div className="p-2 rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-red-600 dark:text-red-400 tabular-nums tracking-tight">
              {stats.criticalCount} Item
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span className="text-red-600 dark:text-red-400 font-semibold">Below Safety Level</span>
            <span className="text-yellow-600 font-medium">{stats.lowCount} Low</span>
          </CardFooter>
        </Card>

        {/* Pending Reorder Capital */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Pending PO Drafts</CardDescription>
              <div className="p-2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {reorders?.length ?? 0} Pending
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Auto-Generated POs</span>
            <Link href="/reorders/purchase-orders" className="hover:underline flex items-center gap-0.5 text-xs font-bold">
              Review <ArrowRight className="w-3 h-3" />
            </Link>
          </CardFooter>
        </Card>

      </div>

      {/* ── 3. STOCK MOVEMENT CHART & INVENTORY DISTRIBUTION ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Movement Chart (Spans 2 Columns) */}
        <div className="lg:col-span-2">
          <ChartAreaInventory />
        </div>

        {/* Inventory Health & Distribution Overview */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Inventory Health Distribution</CardTitle>
                <CardDescription className="text-xs text-slate-600 dark:text-slate-400">Real-time status breakdown across 1,001 products</CardDescription>
              </div>
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs">
                Live Data
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 flex-1">
            {[
              { label: "Healthy Stock", count: stats.healthyCount, color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", pct: Math.round((stats.healthyCount / stats.totalProducts) * 100) },
              { label: "Low Stock Warning", count: stats.lowCount, color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", pct: Math.round((stats.lowCount / stats.totalProducts) * 100) },
              { label: "Critical Stock-Out Risk", count: stats.criticalCount, color: "bg-red-500", text: "text-red-600 dark:text-red-400", pct: Math.round((stats.criticalCount / stats.totalProducts) * 100) },
              { label: "Overstock Excess", count: stats.overstockCount, color: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", pct: Math.round((stats.overstockCount / stats.totalProducts) * 100) },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                  <span className={item.text}>
                    {item.count} SKUs ({item.pct}%)
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-500`}
                    style={{ width: `${Math.max(item.pct, 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
            <span>Automated Safety Level Sync</span>
            <Link href="/inventory" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
              Manage Inventory →
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* ── 4. SUPERMARKET DEPARTMENT HEALTH GRID ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Supermarket Department Overview
          </h2>
          <span className="text-xs text-slate-500">6 Core Store Branch Categories</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { dept: "Dairy & Chilled Foods", items: "185 SKUs", health: "98% Healthy", risk: "1 Critical", color: "border-red-500/30 text-red-500" },
            { dept: "Fresh Produce & Vegetables", items: "240 SKUs", health: "95% Healthy", risk: "2 Low Stock", color: "border-amber-500/30 text-amber-500" },
            { dept: "Beverages & Cold Drinks", items: "310 SKUs", health: "99% Healthy", risk: "1 Overstock", color: "border-blue-500/30 text-blue-500" },
            { dept: "Pantry & Grain Staples", items: "266 SKUs", health: "97% Healthy", risk: "2 Low Stock", color: "border-amber-500/30 text-amber-500" },
          ].map((d) => (
            <Card key={d.dept} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm hover:border-indigo-500/30 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{d.dept}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{d.items}</p>
                </div>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  {d.health}
                </Badge>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">Stock Status:</span>
                <span className={`font-semibold ${d.color}`}>{d.risk}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── 5. AI PENDING REORDERS & DYNAMIC PRICING STREAMS ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* High-Priority AI Reorders Stream */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">AI High-Priority Reorder Queue</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Auto-calculated quantities based on safety stock levels</CardDescription>
                </div>
              </div>
              <Button asChild variant="outline" size="xs" className="rounded-md text-xs">
                <Link href="/reorders/purchase-orders">View All ({reorders?.length ?? 0})</Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 flex-1 flex flex-col justify-start">
            {!reorders || reorders.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2 my-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <span>All product stock levels are healthy! No pending PO drafts required.</span>
              </div>
            ) : (
              reorders.slice(0, 4).map((item) => (
                <div key={item._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{item.productName}</span>
                      <Badge variant={item.urgency === "critical" ? "destructive" : "outline"} className="text-[10px] px-2 py-0">
                        {item.urgency}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      SKU: <span className="font-mono text-slate-700 dark:text-slate-300">{item.productSku}</span> • Supplier: <span className="text-slate-700 dark:text-slate-300 font-medium">{item.supplierName}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right text-xs">
                      <div className="font-bold text-slate-900 dark:text-white">Suggest Qty: {item.suggestedQuantity}</div>
                      <div className="text-slate-500">Est: {formatCurrency(item.suggestedQuantity * item.costPrice)}</div>
                    </div>
                    <Button asChild size="xs" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg">
                      <Link href="/reorders/purchase-orders">Create PO</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
          <CardFooter className="pt-2 mt-auto border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
            <span>Automated Supplier Integration</span>
            <Link href="/reorders" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
              AI Reorder Engine →
            </Link>
          </CardFooter>
        </Card>

        {/* AI Dynamic Price Cuts Stream */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Near-Expiry Dynamic Price Cuts</CardTitle>
                  <CardDescription className="text-xs text-slate-500">AI markdown optimization to prevent food waste & spoilage loss</CardDescription>
                </div>
              </div>
              <Button asChild variant="outline" size="xs" className="rounded-md text-xs">
                <Link href="/forecasting/pricing">View All</Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 flex-1 flex flex-col justify-start">
            {!pricingSuggestions || pricingSuggestions.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2 my-auto">
                <Sparkles className="w-8 h-8 text-indigo-500" />
                <span>Optimal margins active! No dynamic price adjustments needed right now.</span>
              </div>
            ) : (
              pricingSuggestions.slice(0, 4).map((s) => (
                <div key={s._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{s.productName}</span>
                      <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
                        {s.changeDirection === "decrease" ? "Price Markdown" : "Margin Boost"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Reason: <span className="text-slate-700 dark:text-slate-300 font-medium">{s.reason}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right text-xs">
                      <div className="text-slate-400 line-through">{formatCurrency(s.currentPrice)}</div>
                      <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(s.suggestedPrice)}</div>
                    </div>
                    <Button
                      size="xs"
                      onClick={() => handleApplyPriceCut(s._id)}
                      disabled={processingId === s._id}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg"
                    >
                      {processingId === s._id ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Apply Cut"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
          <CardFooter className="pt-2 mt-auto border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
            <span>Neural Markdown Predictor</span>
            <Link href="/forecasting/pricing" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
              Pricing Engine →
            </Link>
          </CardFooter>
        </Card>

      </div>

    </div>
  );
}