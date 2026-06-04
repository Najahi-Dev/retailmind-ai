"use client";
import { useQuery, useMutation } from "convex/react";
import { api }       from "@/convex/_generated/api";
import { Id }        from "@/convex/_generated/dataModel";
import { useState }  from "react";
import { toast }     from "sonner";
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle, CardAction,
} from "@/components/ui/card";
import { Badge }  from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  TrendingUpIcon, TrendingDownIcon,
  MinusIcon, RefreshCwIcon,
  CheckCircleIcon, XCircleIcon,
  SparklesIcon,
  ChartCandlestick,
} from "lucide-react";

const DIRECTION_CONFIG = {
  increase: {
    label:   "Price Increase",
    color:   "text-green-500",
    bg:      "bg-green-500/10",
    border:  "border-green-500/20",
    icon:    <TrendingUpIcon   className="size-4" />,
    badge:   "outline" as const,
  },
  decrease: {
    label:   "Price Decrease",
    color:   "text-red-500",
    bg:      "bg-red-500/10",
    border:  "border-red-500/20",
    icon:    <TrendingDownIcon className="size-4" />,
    badge:   "destructive" as const,
  },
  maintain: {
    label:   "No Change",
    color:   "text-muted-foreground",
    bg:      "bg-muted/50",
    border:  "border-border",
    icon:    <MinusIcon        className="size-4" />,
    badge:   "secondary" as const,
  },
};

// ── Types ─────────────────────────────────────
type SuggestionStatus = "pending" | "approved" | "rejected" | undefined;

export default function PricingClient() {
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus>("pending");

  const suggestions = useQuery(
    api.pricing.getPriceSuggestions,
    { status: statusFilter }
  );
  const stats   = useQuery(api.pricing.getPricingStats);
  const approve = useMutation(api.pricing.approvePriceSuggestion);
  const reject  = useMutation(api.pricing.rejectPriceSuggestion);

  const [processing, setProcessing] = useState<string | null>(null);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency", currency: "LKR",
      maximumFractionDigits: 2,
    }).format(val);

  const handleApprove = async (id: Id<"priceSuggestions">) => {
    setProcessing(id);
    try {
      await approve({ suggestionId: id });
      toast.success("Price updated successfully!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to apply price"
      );
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: Id<"priceSuggestions">) => {
    setProcessing(id);
    try {
      await reject({ suggestionId: id });
      toast.success("Suggestion rejected");
    } finally {
      setProcessing(null);
    }
  };

  if (!suggestions || !stats) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-6 text-muted-foreground">
        <RefreshCwIcon className="animate-spin size-4" />
        Loading pricing suggestions...
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 @container/main">

      {/* ── Header ──────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ChartCandlestick className="size-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-[Montserrat] tracking-tight">
            AI Dynamic Pricing
          </h2>
          <p className="text-sm text-muted-foreground">
            AI-powered price suggestions based on demand, stock levels and seasonality
          </p>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────── */}
      <div className="grid grid-cols-2 gap-4
        *:data-[slot=card]:bg-gradient-to-t
        *:data-[slot=card]:from-primary/5
        *:data-[slot=card]:to-card
        *:data-[slot=card]:shadow-xs
        @5xl/main:grid-cols-4
        dark:*:data-[slot=card]:bg-card"
      >
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {stats.pending}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="p-3">Open</Badge>
            </CardAction>
          </CardHeader>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Increases</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-green-500">
              {stats.increases}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-green-500 p-3">
                <TrendingUpIcon className="size-3" />
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Decreases</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-red-500">
              {stats.decreases}
            </CardTitle>
            <CardAction>
              <Badge variant="destructive" className="p-3">
                <TrendingDownIcon className="size-3" />
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Applied Today</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-primary">
              {stats.approved}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="p-3">
                <CheckCircleIcon className="size-3" />
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>
      </div>

      {/* ── Suggestions List ────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">
                Price Suggestions
              </CardTitle>
              <CardDescription>
                {suggestions.length} suggestions
              </CardDescription>
            </div>
            <Select
              value={statusFilter ?? "all"}
              onValueChange={v =>
                setStatusFilter(
                  v === "all" ? undefined : v as typeof statusFilter
                )
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <SparklesIcon className="size-10 opacity-40" />
              <p className="font-medium">No suggestions found</p>
              <p className="text-sm">
                AI pricing runs nightly and generates suggestions automatically
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map(s => {
                const config      = DIRECTION_CONFIG[s.changeDirection];
                const isProcessing = processing === s._id;

                return (
                  <div
                    key={s._id}
                    className={`
                      rounded-lg border p-4 transition-colors
                      ${s.status === "pending"
                        ? "hover:bg-muted/30"
                        : "opacity-70"}
                    `}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                      {/* Left — product + reason */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`
                          mt-0.5 shrink-0 p-1.5 rounded-md
                          ${config.bg} ${config.color}
                        `}>
                          {config.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {s.productName}
                            </span>
                            <Badge variant={config.badge} className="text-[10px]">
                              {s.priceChange > 0 ? "+" : ""}
                              {s.priceChange.toFixed(1)}%
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {(s.confidence * 100).toFixed(0)}% confidence
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                            {s.productSku}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {s.reason}
                          </p>

                          {/* Factors */}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {[
                              { k: "Stock",    v: s.factors.stockLevel  },
                              { k: "Demand",   v: s.factors.demandTrend },
                              { k: "Season",   v: s.factors.seasonality },
                              { k: "Days",     v: `${s.factors.daysOfStock}d` },
                            ].map(f => (
                              <span
                                key={f.k}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground"
                              >
                                <span className="opacity-60">{f.k}:</span>
                                {f.v}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right — prices + actions */}
                      <div className="flex items-center gap-4 shrink-0 flex-wrap">

                        {/* Price display */}
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Current</p>
                              <p className="text-sm font-medium">
                                {formatCurrency(s.currentPrice)}
                              </p>
                            </div>
                            <div className={`text-xs ${config.color}`}>
                              {config.icon}
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Suggested</p>
                              <p className={`text-sm font-bold ${config.color}`}>
                                {formatCurrency(s.suggestedPrice)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        {s.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="w-24 justify-center"
                              disabled={isProcessing}
                              onClick={() =>
                                handleApprove(s._id as Id<"priceSuggestions">)
                              }
                            >
                              {isProcessing ? (
                                <RefreshCwIcon className="animate-spin size-3" />
                              ) : (
                                <>
                                  <CheckCircleIcon className="size-3 mr-1" />
                                  Apply
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-24 justify-center"
                              disabled={isProcessing}
                              onClick={() =>
                                handleReject(s._id as Id<"priceSuggestions">)
                              }
                            >
                              <XCircleIcon className="size-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}

                        {s.status === "approved" && (
                          <Badge variant="outline" className="text-green-500 border-green-200">
                            <CheckCircleIcon className="size-3 mr-1" />
                            Applied
                          </Badge>
                        )}

                        {s.status === "rejected" && (
                          <Badge variant="secondary">
                            Rejected
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