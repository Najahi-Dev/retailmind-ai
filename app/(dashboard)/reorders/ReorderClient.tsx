"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge }   from "@/components/ui/badge";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangleIcon, TrendingDownIcon, CheckCircleIcon,
  XCircleIcon, RefreshCwIcon, RotateCcwIcon, SearchIcon,
  ShoppingCartIcon, SparklesIcon, ArrowRightIcon,
  BoxesIcon, Building2Icon, CalendarIcon, PlusIcon
} from "lucide-react";

const URGENCY_CONFIG = {
  critical: {
    label: "Critical Stockout",
    badgeClass: "bg-red-500/10 text-red-600 border-red-500/20",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10 dark:bg-red-500/20",
    border: "border-red-500/30",
    icon: <AlertTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
  },
  high: {
    label: "High Priority",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    border: "border-amber-500/30",
    icon: <TrendingDownIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
  },
  medium: {
    label: "Medium Buffer",
    badgeClass: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-500/10 dark:bg-yellow-500/20",
    border: "border-yellow-500/30",
    icon: <BoxesIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
  },
  low: {
    label: "Low Urgency",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400",
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800",
    border: "border-slate-200 dark:border-slate-700",
    icon: <BoxesIcon className="w-5 h-5 text-slate-500" />
  },
};

export default function ReordersClient() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "dismissed" | undefined>("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const suggestions = useQuery(api.reorder.getReorderSuggestions, {
    status: statusFilter,
  });
  const stats = useQuery(api.reorder.getReorderStats);
  const dismiss = useMutation(api.reorder.dismissSuggestion);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(val);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", { day: "numeric", month: "short" });

  if (!suggestions || !stats) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-slate-500 p-12 font-semibold text-xs">
        <RefreshCwIcon className="animate-spin size-4 text-indigo-500" />
        Scanning stock levels & reorder suggestions...
      </div>
    );
  }

  const filteredSuggestions = suggestions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.productName.toLowerCase().includes(q) || s.productSku.toLowerCase().includes(q) || (s.supplierName && s.supplierName.toLowerCase().includes(q));
  });

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 lg:p-6 w-full">
      {/* ── 1. HERO REORDER BANNER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
        {/* Glow Ambient Effect */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <SparklesIcon className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Automated Reorder Intelligence & Replenishment Hub
                </h1>
                <Badge className="text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5">
                  AI Replenishment Active
                </Badge>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1 max-w-2xl leading-relaxed">
                Automated stock buffer monitoring triggers purchase orders when items cross safety thresholds.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              onClick={() => router.push("/reorders/purchase-orders")}
              className="h-9 rounded-xl text-xs font-semibold text-indigo-200 bg-white/10 hover:bg-white/20 border-white/20 px-4"
            >
              <ShoppingCartIcon className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> View Active POs
            </Button>
            <Button
              onClick={() => router.push("/reorders/purchase-orders/create")}
              className="h-9 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 shadow-md border-0"
            >
              <PlusIcon className="w-4 h-4 mr-1.5" /> Create Manual PO
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. TOP KPI STATS METRICS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Suggestions</p>
            <Badge variant="outline" className="text-[10px] font-bold border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 px-2 py-0.5">
              <RotateCcwIcon className="w-3 h-3 mr-1" /> Open
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums mt-2">
            {stats.pending}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Awaiting Review & PO Generation</p>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Critical Emergencies</p>
            <Badge className="text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20 px-2 py-0.5">
              <AlertTriangleIcon className="w-3 h-3 mr-1" /> Urgent
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400 tabular-nums mt-2">
            {stats.critical}
          </p>
          <p className="text-[11px] text-red-600 dark:text-red-400 font-medium mt-1">Below Safety Stock Buffer</p>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">High Priority Items</p>
            <Badge className="text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5">
              <TrendingDownIcon className="w-3 h-3 mr-1" /> High
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-2">
            {stats.high}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Nearing Reorder Threshold</p>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Approved Today</p>
            <Badge className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5">
              <CheckCircleIcon className="w-3 h-3 mr-1" /> Done
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-2">
            {stats.approved}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">Converted to Vendor POs</p>
        </Card>
      </div>

      {/* ── 3. REORDER SUGGESTIONS QUEUE ── */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCartIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Smart Replenishment Suggestions Queue
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Displaying {filteredSuggestions.length} automated replenishment recommendations
              </CardDescription>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px]">
                <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
                  setStatusFilter(v === "all" ? undefined : (v as any))
                }
              >
                <SelectTrigger className="w-36 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved & PO Issued</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                  <SelectItem value="all">All Suggestions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {filteredSuggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500 text-center">
              <CheckCircleIcon className="w-10 h-10 text-emerald-500/50" />
              <p className="font-bold text-slate-900 dark:text-white">All Reorder Queues Up To Date</p>
              <p className="text-xs text-slate-500 max-w-sm">
                No active {statusFilter} reorder recommendations found matching your search parameters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSuggestions.map((s) => {
                const config = URGENCY_CONFIG[s.urgency];
                return (
                  <div
                    key={s._id}
                    className={`
                      rounded-2xl border p-4 sm:p-5 transition-all duration-200
                      ${
                        s.status === "pending"
                          ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/40 shadow-xs"
                          : "bg-slate-100/40 dark:bg-slate-950/40 border-slate-200/40 dark:border-slate-900 opacity-80"
                      }
                    `}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left Block — Product Identity & Rationale */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={`
                            mt-0.5 shrink-0 size-10 rounded-xl flex items-center justify-center
                            ${config.bg} ${config.border} border shadow-xs
                          `}
                        >
                          {config.icon}
                        </div>

                        <div className="min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                              {s.productName}
                            </span>
                            <Badge className={`text-xs font-extrabold px-2.5 py-0.5 ${config.badgeClass}`}>
                              {config.label}
                            </Badge>
                            <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md">
                              SKU: {s.productSku}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold flex-wrap">
                            <span>On Hand: <strong className="text-slate-900 dark:text-white">{s.onHand}</strong></span>
                            <span>•</span>
                            <span>Reorder Pt: <strong className="text-amber-600 dark:text-amber-400">{s.reorderPoint}</strong></span>
                            {s.supplierName && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1">
                                  <Building2Icon className="w-3 h-3 text-indigo-500" />
                                  {s.supplierName}
                                </span>
                              </>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                            {s.rationale}
                          </p>
                        </div>
                      </div>

                      {/* Right Block — Quantity, Valuation & Actions */}
                      <div className="flex items-center gap-5 shrink-0 flex-wrap justify-between lg:justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/60 dark:border-slate-800">
                        <div className="text-right">
                          <p className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                            {s.suggestedQuantity} units
                          </p>
                          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                            Est. {formatCurrency(s.estimatedCost ?? 0)}
                          </p>
                          {s.orderByDate && (
                            <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1 justify-end mt-0.5">
                              <CalendarIcon className="w-3 h-3 text-slate-400" /> By {formatDate(s.orderByDate)}
                            </p>
                          )}
                        </div>

                        {s.status === "pending" && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => router.push(`/reorders/${s._id}`)}
                              className="h-9 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 border-0 shadow-xs"
                            >
                              Review & Create PO <ArrowRightIcon className="w-3.5 h-3.5 ml-1" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => dismiss({ suggestionId: s._id })}
                              className="h-9 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 px-3"
                            >
                              <XCircleIcon className="w-3.5 h-3.5 mr-1 text-slate-400" /> Dismiss
                            </Button>
                          </div>
                        )}

                        {s.status === "approved" && (
                          <Badge
                            className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-extrabold px-3 py-1"
                          >
                            <CheckCircleIcon className="w-3.5 h-3.5 mr-1" /> PO Generated
                          </Badge>
                        )}

                        {s.status === "dismissed" && (
                          <Badge
                            className="bg-slate-100 text-slate-500 border border-slate-200 text-xs font-semibold px-3 py-1"
                          >
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