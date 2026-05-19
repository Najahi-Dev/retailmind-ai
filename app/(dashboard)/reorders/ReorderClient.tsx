"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction,
} from "@/components/ui/card";
import { Badge }   from "@/components/ui/badge";
import { Button }  from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangleIcon, TrendingDownIcon, CheckCircleIcon,
  XCircleIcon, RefreshCwIcon, RotateCcwIcon,
} from "lucide-react";

const URGENCY_CONFIG = {
  critical: { label: "Critical", variant: "destructive" as const, color: "text-destructive"  },
  high:     { label: "High",     variant: "secondary"   as const, color: "text-orange-500"   },
  medium:   { label: "Medium",   variant: "outline"     as const, color: "text-yellow-500"   },
  low:      { label: "Low",      variant: "outline"     as const, color: "text-muted-foreground" },
};

export default function ReordersClient() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "dismissed" | undefined>("pending");

  const suggestions = useQuery(api.reorder.getReorderSuggestions, {
    status: statusFilter,
  });
  const stats     = useQuery(api.reorder.getReorderStats);
  const dismiss   = useMutation(api.reorder.dismissSuggestion);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(val);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", { day: "numeric", month: "short" });

  if (!suggestions || !stats) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground p-6">
        <RefreshCwIcon className="animate-spin size-4" />
        Loading suggestions...
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 @container/main">
      {/* KPI Cards */}
      <div
        className="grid grid-cols-2 gap-4
        *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5
        *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs
        @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card"
      >
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {stats.pending}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="p-3">
                <RotateCcwIcon className="size-3" /> Open
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Critical</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-destructive">
              {stats.critical}
            </CardTitle>
            <CardAction>
              <Badge variant="destructive" className="p-3">
                <AlertTriangleIcon className="size-3" /> Urgent
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>High Priority</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-orange-500">
              {stats.high}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-orange-500 p-3">
                <TrendingDownIcon className="size-3" /> High
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Approved Today</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums text-green-500">
              {stats.approved}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-green-500 p-3">
                <CheckCircleIcon className="size-3" /> Done
              </Badge>
            </CardAction>
          </CardHeader>
        </Card>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">Reorder Suggestions</CardTitle>
              <CardDescription>
                {suggestions.length} suggestions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={statusFilter ?? "all"}
                onValueChange={(v) =>
                  setStatusFilter(v === "all" ? undefined : (v as any))
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <CheckCircleIcon className="size-10 opacity-40" />
              <p className="font-medium">All clear</p>
              <p className="text-sm">No {statusFilter} suggestions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((s) => (
                <div
                  key={s._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                >
                  {/* Left — product info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`mt-0.5 shrink-0 ${URGENCY_CONFIG[s.urgency].color}`}
                    >
                      <AlertTriangleIcon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {s.productName}
                        </span>
                        <Badge
                          variant={URGENCY_CONFIG[s.urgency].variant}
                          className="text-[10px]"
                        >
                          {URGENCY_CONFIG[s.urgency].label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.productSku} · On Hand: {s.onHand} · Reorder Pt:{" "}
                        {s.reorderPoint}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {s.rationale}
                      </p>
                    </div>
                  </div>

                  {/* Right — qty, cost, actions */}
                  <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {s.suggestedQuantity} units
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(s.estimatedCost ?? 0)}
                      </p>
                      {s.orderByDate && (
                        <p className="text-xs text-muted-foreground">
                          By {formatDate(s.orderByDate)}
                        </p>
                      )}
                    </div>

                    {s.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => router.push(`/reorders/${s._id}`)}
                        >
                          Review
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => dismiss({ suggestionId: s._id })}
                        >
                          <XCircleIcon className="size-3 mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    )}

                    {s.status === "approved" && (
                      <Badge
                        variant="outline"
                        className="text-green-500 border-green-200"
                      >
                        <CheckCircleIcon className="size-3 mr-1" /> Approved
                      </Badge>
                    )}

                    {s.status === "dismissed" && (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        Dismissed
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}