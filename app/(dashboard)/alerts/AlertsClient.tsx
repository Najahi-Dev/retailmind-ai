// app/(dashboard)/alerts/AlertsClient.tsx
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BellIcon,
  AlertTriangleIcon,
  TrendingDownIcon,
  ClockIcon,
  EyeIcon,
  XIcon,
  CheckCircleIcon,
  PackageIcon,
  InfoIcon,
  CheckCheckIcon,
  Settings2Icon,
  PlusIcon,
  RefreshCwIcon,
  ChevronRightIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";
import CreateAlertDialog from "./CreateAlertDialog";

interface Props {
  role: string;
}

const PRIORITY_DOT_COLORS: Record<string, string> = {
  critical: "bg-red-500 shadow-sm shadow-red-500/50",
  high: "bg-orange-500 shadow-sm shadow-orange-500/50",
  medium: "bg-yellow-500 shadow-sm shadow-yellow-500/50",
  low: "bg-slate-400 dark:bg-slate-500",
};

const PRIORITY_ACCENT_BORDERS: Record<string, string> = {
  critical: "border-l-4 border-l-red-500",
  high: "border-l-4 border-l-orange-500",
  medium: "border-l-4 border-l-yellow-500",
  low: "border-l-4 border-l-slate-400 dark:border-l-slate-600",
};

export default function AlertsClient({ role }: Props) {
  const router = useRouter();

  // Filter States
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "unread" | "read"
  const [priorityFilter, setPriorityFilter] = useState("all"); // "all" | "critical" | "high" | "medium" | "low"
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "low_stock" | "critical_stock" | "overstock" | "demand_spike" | "system"
  const [createOpen, setCreateOpen] = useState(false);

  // Queries
  const { token } = useAuth();
  const alerts = useQuery(api.alerts.getAlerts, {
    token: token ?? undefined,
    status: statusFilter,
    priority: priorityFilter,
    type: typeFilter,
  });
  const stats = useQuery(api.alerts.getAlertStats, { token: token ?? undefined });

  // Mutations
  const markAlertRead = useMutation(api.alerts.markAlertRead);
  const markAllRead = useMutation(api.alerts.markAllRead);
  const dismissAlert = useMutation(api.alerts.dismissAlert);
  const snoozeAlert = useMutation(api.alerts.snoozeAlert);

  const handleMarkRead = async (alertId: Id<"alerts">) => {
    try {
      await markAlertRead({ alertId });
      toast.success("Alert Marked");
    } catch (err) {
      toast.error("Failed to remove alert");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead({ token: token ?? undefined });
      toast.success("All unread alerts cleared");
    } catch (err) {
      toast.error("Failed to clear alerts");
    }
  };

  const handleDismiss = async (alertId: Id<"alerts">) => {
    try {
      await dismissAlert({ alertId });
      toast.success("Alert dismissed");
    } catch (err) {
      toast.error("Failed to dismiss alert");
    }
  };

  const handleSnooze = async (alertId: Id<"alerts">, durationMs: number) => {
    try {
      const snoozeUntil = Date.now() + durationMs;
      await snoozeAlert({ alertId, snoozeUntil });
      toast.success("Alert snoozed");
    } catch (err) {
      toast.error("Failed to snooze alert");
    }
  };

  const formatRelativeTime = (ts: number) => {
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} hours ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
    const days = Math.floor(diffSec / 86400);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  const renderTypeIcon = (type: string) => {
    switch (type) {
      case "low_stock":
        return <TrendingDownIcon className="w-5 h-5 text-orange-500 shrink-0" />;
      case "critical_stock":
        return <AlertTriangleIcon className="w-5 h-5 text-red-500 shrink-0" />;
      case "overstock":
        return <PackageIcon className="w-5 h-5 text-blue-500 shrink-0" />;
      case "system":
      default:
        return <InfoIcon className="w-5 h-5 text-indigo-500 shrink-0" />;
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full">
      {/* ── 1. HERO HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 text-white p-6 rounded-xl shadow-xl border shadow-lg relative overflow-hidden">
        {/* Glow Ambient Effect */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <BellIcon className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Alerts Center & Risk Control Hub
                </h1>
                <Badge className="text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5">
                  Real-time Stream
                </Badge>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1 sm:max-w-2xl w-[95vw] sm:w-full leading-relaxed">
                Monitor critical stock outages, low inventory thresholds, overstock warnings, and automated system alerts.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link href="/alerts/preferences">
              <Button
                variant="outline"
                className="h-9 rounded-xl text-xs font-semibold text-indigo-200 bg-white/10 hover:bg-white/20 border-white/20 px-3"
              >
                <Settings2Icon className="w-3.5 h-3.5 mr-1.5" /> Preferences
              </Button>
            </Link>
            <Button
              onClick={() => setCreateOpen(true)}
              className="h-9 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 shadow-md border-0"
            >
              <PlusIcon className="w-4 h-4 mr-1.5" /> Dispatch Alert
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. TOP KPI STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Unread */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Unread</p>
            <Badge className="text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 px-2 py-0.5">
              <BellIcon className="w-3 h-3 mr-1" /> Unread
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums mt-2">
            {stats?.unread ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Pending Operational Review</p>
        </Card>

        {/* Card 2: Critical */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Critical Priority</p>
            <Badge className="text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20 px-2 py-0.5">
              <AlertTriangleIcon className="w-3 h-3 mr-1" /> Critical
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400 tabular-nums mt-2">
            {stats?.critical ?? 0}
          </p>
          <p className="text-[11px] text-red-600 dark:text-red-400 font-medium mt-1">Stock Outage Alert</p>
        </Card>

        {/* Card 3: High Priority */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">High Priority</p>
            <Badge className="text-[10px] font-bold bg-orange-500/10 text-orange-600 border border-orange-500/20 px-2 py-0.5">
              <TrendingDownIcon className="w-3 h-3 mr-1" /> High
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400 tabular-nums mt-2">
            {stats?.high ?? 0}
          </p>
          <p className="text-[11px] text-orange-600 dark:text-orange-400 font-medium mt-1">Reorder Point Warnings</p>
        </Card>

        {/* Card 4: Snoozed */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Snoozed Alerts</p>
            <Badge className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 px-2 py-0.5">
              <ClockIcon className="w-3 h-3 mr-1" /> Snoozed
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-700 dark:text-slate-300 tabular-nums mt-2">
            {stats?.snoozed ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Temporarily Muted Stream</p>
        </Card>
      </div>

      {/* ── 3. FILTER BAR CONTROL PANEL ── */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Tab Group */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              {[
                { id: "all", label: "All" },
                { id: "unread", label: "Unread" },
                { id: "read", label: "Read" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    statusFilter === tab.id
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Priority Select */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-36 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Select */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="critical_stock">Critical Stock</SelectItem>
                <SelectItem value="overstock">Overstock</SelectItem>
                <SelectItem value="demand_spike">Demand Spike</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mark All Read Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="h-9 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 shrink-0"
          >
            <CheckCheckIcon className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> Mark All Read
          </Button>
        </div>
      </Card>

      {/* ── 4. ALERTS LIST STREAM ── */}
      <div className="space-y-3">
        {!alerts ? (
          // Loading Skeleton of 5 Cards
          Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs animate-pulse flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 w-full">
                <div className="size-3 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="size-6 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                  <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-850 rounded-md" />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              </div>
            </div>
          ))
        ) : alerts.length === 0 ? (
          // Empty State
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
            <div className="flex flex-col items-center justify-center gap-3">
              <CheckCircleIcon className="w-12 h-12 text-emerald-500 opacity-90" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">All clear, no alerts found</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                No active operational risk notifications match your filter selections.
              </p>
            </div>
          </Card>
        ) : (
          // Render Alert Cards
          alerts.map((alert) => {
            const isUnread = !alert.isRead;
            const dotColor = PRIORITY_DOT_COLORS[alert.priority] ?? PRIORITY_DOT_COLORS.low;
            const accentBorder = isUnread
              ? (PRIORITY_ACCENT_BORDERS[alert.priority] ?? PRIORITY_ACCENT_BORDERS.low)
              : "";

            return (
              <Card
                key={alert._id}
                className={`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 transition-all shadow-xs ${accentBorder} ${
                  !isUnread ? "opacity-75 bg-slate-50/50 dark:bg-slate-900/40" : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Priority Dot */}
                    <div className={`size-3 rounded-full ${dotColor} shrink-0 mt-1.5`} />

                    {/* Alert Type Icon */}
                    <div className="shrink-0 mt-0.5">{renderTypeIcon(alert.type)}</div>

                    {/* Alert Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white text-sm leading-snug">
                        {alert.message}
                      </p>

                      {/* Product Name & SKU */}
                      {alert.product ? (
                        <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-slate-500">
                          <Link
                            href={`/inventory/${alert.product._id}`}
                            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                          >
                            {alert.product.name}
                            <span className="font-mono text-[11px] text-slate-400 font-semibold">({alert.product.sku})</span>
                          </Link>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 font-medium mt-0.5">System Alert</p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Relative Time */}
                  <div className="flex flex-col sm:items-end gap-2.5 shrink-0">
                    <div className="flex items-center gap-1.5">
                      {/* Mark Read Button (Visible if unread) */}
                      {isUnread && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMarkRead(alert._id)}
                          className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 rounded-xl"
                        >
                          <EyeIcon className="w-3.5 h-3.5 mr-1" /> Mark Read
                        </Button>
                      )}

                      {/* Snooze Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 rounded-xl"
                          >
                            <ClockIcon className="w-3.5 h-3.5 mr-1" /> Snooze
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-lg text-xs font-semibold p-1">
                          <DropdownMenuItem onClick={() => handleSnooze(alert._id, 1 * 3600 * 1000)}>
                            Snooze 1 hour
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSnooze(alert._id, 4 * 3600 * 1000)}>
                            Snooze 4 hours
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSnooze(alert._id, 24 * 3600 * 1000)}>
                            Snooze until tomorrow
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSnooze(alert._id, 7 * 24 * 3600 * 1000)}>
                            Snooze 1 week
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Dismiss Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDismiss(alert._id)}
                        className="h-8 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 px-2 rounded-xl"
                      >
                        <XIcon className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Relative Time */}
                    <span className="text-[11px] text-slate-400 font-medium self-end">
                      {formatRelativeTime(alert.createdAt)}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <CreateAlertDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
