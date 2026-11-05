"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect } from "react";
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
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
} from "lucide-react";

const PAGE_SIZE = 10;
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
type DirectionFilter = "all" | "increase" | "decrease";
type StockFilter = "all" | "critical" | "low" | "overstock";
type ConfidenceFilter = "all" | "90" | "80" | "70";
type SortKey = "newest" | "change" | "confidence" | "impact" | "name";

const DIRECTION_LABELS: Record<Exclude<DirectionFilter, "all">, string> = {
  increase: "Price increases",
  decrease: "Markdowns",
};
const STOCK_LABELS: Record<Exclude<StockFilter, "all">, string> = {
  critical: "Critical stock",
  low: "Low stock",
  overstock: "Overstock",
};
const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest first",
  change: "Largest % change",
  confidence: "Highest confidence",
  impact: "Biggest 30d impact",
  name: "Product A–Z",
};

export default function PricingClient() {
  const { token } = useAuth();
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("newest");

  const clearFilters = () => {
    setSearchQuery("");
    setDirectionFilter("all");
    setStockFilter("all");
    setConfidenceFilter("all");
    setSortBy("newest");
    setPage(1);
  };

  const access = useQuery(api.subscriptions.checkFeatureAccess, { token: token ?? undefined });
  const suggestions = useQuery(api.pricing.getPriceSuggestions, { token: token ?? undefined, status: statusFilter });
  const stats = useQuery(api.pricing.getPricingStats, { token: token ?? undefined });
  const approve = useMutation(api.pricing.approvePriceSuggestion);
  const reject = useMutation(api.pricing.rejectPriceSuggestion);
  const cleanup = useMutation(api.pricing.cleanupDuplicatePriceSuggestions);
  const runScan = useMutation(api.pricing.generatePriceSuggestionsPublic);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (token) {
      cleanup({ token }).catch(() => {});
    }
  }, [token, cleanup]);

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
      const result = await approve({ token: token ?? undefined, suggestionId: id });
      if (result.blocked) toast.warning(result.reason);
      else toast.success("AI Price update applied successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply price");
    } finally {
      setProcessing(null);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const r = await runScan({ token: token ?? undefined });
      toast.success(
        `Price scan complete: ${r.created} new, ${r.updated} refreshed, ${r.removed} no longer needed.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Price scan failed");
    } finally {
      setScanning(false);
    }
  };

  const handleReject = async (id: Id<"priceSuggestions">) => {
    setProcessing(id);
    try {
      await reject({ token: token ?? undefined, suggestionId: id });
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

  const pctOf = (s: { currentPrice: number; suggestedPrice: number }) =>
    s.currentPrice > 0 ? ((s.suggestedPrice - s.currentPrice) / s.currentPrice) * 100 : 0;

  const query = searchQuery.trim().toLowerCase();
  const filteredSuggestions = suggestions
    .filter((s) => {
      if (
        query &&
        !(
          s.productName.toLowerCase().includes(query) ||
          s.productSku.toLowerCase().includes(query) ||
          s.reason.toLowerCase().includes(query)
        )
      ) {
        return false;
      }
      if (directionFilter !== "all" && s.changeDirection !== directionFilter) return false;
      // factors.stockLevel looks like "12 units · critical · 2 locations"
      if (stockFilter !== "all" && !s.factors.stockLevel.toLowerCase().includes(stockFilter)) return false;
      if (confidenceFilter !== "all" && s.confidence * 100 < Number(confidenceFilter)) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "change":
          return Math.abs(pctOf(b)) - Math.abs(pctOf(a));
        case "confidence":
          return b.confidence - a.confidence;
        case "impact":
          return Math.abs(b.projectedImpact ?? 0) - Math.abs(a.projectedImpact ?? 0);
        case "name":
          return a.productName.localeCompare(b.productName);
        default:
          return (b.createdAt ?? b._creationTime) - (a.createdAt ?? a._creationTime);
      }
    });

  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (query) activeChips.push({ key: "q", label: `“${searchQuery.trim()}”`, clear: () => setSearchQuery("") });
  if (directionFilter !== "all")
    activeChips.push({ key: "dir", label: DIRECTION_LABELS[directionFilter], clear: () => setDirectionFilter("all") });
  if (stockFilter !== "all")
    activeChips.push({ key: "stock", label: STOCK_LABELS[stockFilter], clear: () => setStockFilter("all") });
  if (confidenceFilter !== "all")
    activeChips.push({
      key: "conf",
      label: `≥ ${confidenceFilter}% confidence`,
      clear: () => setConfidenceFilter("all"),
    });
  const hasActiveFilters = activeChips.length > 0;
  if (sortBy !== "newest")
    activeChips.push({ key: "sort", label: `Sort: ${SORT_LABELS[sortBy]}`, clear: () => setSortBy("newest") });

  const statusTabs: { value: SuggestionStatus; label: string; count: number }[] = [
    { value: "pending", label: "Pending", count: stats.pending },
    { value: "approved", label: "Approved", count: stats.approved },
    { value: "rejected", label: "Rejected", count: stats.rejected },
    { value: undefined, label: "All", count: stats.total },
  ];

  const totalPages = Math.max(1, Math.ceil(filteredSuggestions.length / PAGE_SIZE));
  // Clamp: approving/rejecting can empty the last page.
  const currentPage = Math.min(page, totalPages);
  const paginatedSuggestions = filteredSuggestions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const rangeStart = filteredSuggestions.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredSuggestions.length);

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full">

      {/* ── 1. EXECUTIVE HEADER & HERO BANNER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 text-white p-6 rounded-xl shadow-xl border shadow-lg relative overflow-hidden">
        {/* Glow Overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

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
          <p className="text-xs sm:text-sm text-slate-300 sm:max-w-2xl w-[95vw] sm:w-full">
            Real-time automated price markdowns for near-expiry inventory & margin boosts based on demand velocity, safety stock, and seasonality.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 z-10">
          <Button
            size="sm"
            onClick={handleScan}
            disabled={scanning}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-md border-0 rounded-xl"
          >
            {scanning ? (
              <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-1.5" />
            )}
            {scanning ? "Scanning..." : "Run AI Price Scan"}
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
            <span title="Price change × units expected to sell in the next 30 days">
              Est. {stats.totalPotentialProfit >= 0 ? "+" : ""}
              {formatCurrency(stats.totalPotentialProfit)} / 30d
            </span>
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
            <span className="text-red-600 dark:text-red-400 font-semibold">Overstock clearance</span>
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
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 space-y-4">
          {/* Title + status tabs */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                AI Price Recommendations Queue
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                {filteredSuggestions.length === suggestions.length
                  ? `${suggestions.length} price suggestions`
                  : `${filteredSuggestions.length} of ${suggestions.length} price suggestions match your filters`}
              </CardDescription>
            </div>

            <div
              role="tablist"
              aria-label="Suggestion status"
              className="inline-flex w-full lg:w-auto overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-800/70 p-1 gap-1"
            >
              {statusTabs.map((tab) => {
                const active = statusFilter === tab.value;
                return (
                  <button
                    key={tab.label}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setStatusFilter(tab.value);
                      setPage(1);
                    }}
                    className={`flex-1 lg:flex-none whitespace-nowrap px-3 h-8 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      active
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`tabular-nums text-[10px] px-1.5 py-0.5 rounded-md ${
                        active
                          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                          : "bg-slate-200/70 dark:bg-slate-700/60"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search + filters */}
          <div className="flex flex-col xl:flex-row xl:items-center gap-2.5">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search product, SKU or reason..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 xl:flex xl:items-center">
              <Select
                value={directionFilter}
                onValueChange={(v) => {
                  setDirectionFilter(v as DirectionFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full xl:w-40 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="increase">Price increases</SelectItem>
                  <SelectItem value="decrease">Markdowns</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={stockFilter}
                onValueChange={(v) => {
                  setStockFilter(v as StockFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full xl:w-40 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stock levels</SelectItem>
                  <SelectItem value="critical">Critical stock</SelectItem>
                  <SelectItem value="low">Low stock</SelectItem>
                  <SelectItem value="overstock">Overstock</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={confidenceFilter}
                onValueChange={(v) => {
                  setConfidenceFilter(v as ConfidenceFilter);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full xl:w-40 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any confidence</SelectItem>
                  <SelectItem value="90">≥ 90% confidence</SelectItem>
                  <SelectItem value="80">≥ 80% confidence</SelectItem>
                  <SelectItem value="70">≥ 70% confidence</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sortBy}
                onValueChange={(v) => {
                  setSortBy(v as SortKey);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full xl:w-44 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                  <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {SORT_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filter chips */}
          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Active:
              </span>
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => {
                    chip.clear();
                    setPage(1);
                  }}
                  className="inline-flex items-center gap-1 h-6 pl-2.5 pr-1.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
                  aria-label={`Remove filter ${chip.label}`}
                >
                  {chip.label}
                  <X className="w-3 h-3" />
                </button>
              ))}
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white underline-offset-2 hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-6">
          {filteredSuggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500 text-center">
              <Sparkles className="w-10 h-10 text-indigo-500/50" />
              <p className="font-bold text-slate-900 dark:text-white">
                {hasActiveFilters ? "No suggestions match your filters" : "No Price Suggestions Found"}
              </p>
              <p className="text-xs text-slate-500 max-w-sm">
                {hasActiveFilters
                  ? "Try removing a filter or searching for something else."
                  : "AI pricing runs nightly and suggests changes based on stock levels and sales velocity. Use “Run AI Price Scan” to check now."}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 rounded-xl text-xs mt-1"
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedSuggestions.map((s) => {
                const config = DIRECTION_CONFIG[s.changeDirection];
                const isProcessing = processing === s._id;
                // Derive % from the prices themselves so older rows that stored
                // an LKR difference in `priceChange` still display correctly.
                const changePct =
                  s.currentPrice > 0 ? ((s.suggestedPrice - s.currentPrice) / s.currentPrice) * 100 : 0;

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
                              {changePct > 0 ? "+" : ""}
                              {changePct.toFixed(1)}%
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
                              {
                                k: "Days Left",
                                v: s.factors.daysOfStock >= 0 ? `${s.factors.daysOfStock}d` : "No sales data",
                              },
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 mt-5 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Showing <span className="font-bold text-slate-900 dark:text-white">{rangeStart}–{rangeEnd}</span> of{" "}
                <span className="font-bold text-slate-900 dark:text-white">{filteredSuggestions.length}</span> suggestions
                {" "}— page <span className="font-bold text-slate-900 dark:text-white">{currentPage}</span> of{" "}
                <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="h-8 rounded-xl text-xs border-slate-300 dark:border-slate-800"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 rounded-xl text-xs border-slate-300 dark:border-slate-800"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}