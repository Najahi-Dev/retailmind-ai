// app/(dashboard)/suppliers/SuppliersClient.tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  TruckIcon,
  PlusIcon,
  SearchIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  Building2Icon,
  ClockIcon,
  AlertCircleIcon,
  XCircleIcon,
  ChevronRightIcon,
  SparklesIcon,
} from "lucide-react";
import AddSupplierDialog from "./AddSupplierDialog";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string; icon: any }> = {
  active: {
    label: "Active",
    bg: "bg-emerald-500/10",
    color: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
    icon: CheckCircleIcon,
  },
  inactive: {
    label: "Inactive",
    bg: "bg-slate-100 dark:bg-slate-800",
    color: "text-slate-600 dark:text-slate-400",
    border: "border-slate-300 dark:border-slate-700",
    icon: XCircleIcon,
  },
  on_hold: {
    label: "On Hold",
    bg: "bg-amber-500/10",
    color: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    icon: AlertCircleIcon,
  },
};

export default function SuppliersClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  const suppliers = useQuery(api.suppliers.getSuppliers, {
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const stats = useQuery(api.suppliers.getSupplierStats);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(val);

  const filtered = useMemo(() => {
    if (!suppliers) return [];
    if (!search) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()),
    );
  }, [suppliers, search]);

  if (!suppliers || !stats) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-12 text-slate-500 font-semibold text-xs">
        <RefreshCwIcon className="animate-spin size-4 text-indigo-500" />
        Loading supplier intelligence network...
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full">
      {/* ── 1. HERO HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
        {/* Glow Ambient Effect */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Building2Icon className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Supplier Intelligence & Procurement Network
                </h1>
                <Badge className="text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5">
                  Vendor Network Sync
                </Badge>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1 max-w-2xl leading-relaxed">
                Monitor active vendor relationships, lead times, order fulfillment value, and supplier reliability metrics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              onClick={() => setAddOpen(true)}
              className="h-9 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 shadow-md border-0"
            >
              <PlusIcon className="w-4 h-4 mr-1.5" /> Add Supplier
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. TOP KPI METRICS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Suppliers</p>
            <Badge variant="outline" className="text-[10px] font-bold border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5">
              <Building2Icon className="w-3 h-3 mr-1" /> All
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums mt-2">
            {stats.total}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Total Registered Vendor Partners</p>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Vendors</p>
            <Badge className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5">
              <CheckCircleIcon className="w-3 h-3 mr-1" /> Active
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-2">
            {stats.active}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">Primary Active Supply Channels</p>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">On Hold</p>
            <Badge className="text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5">
              <AlertCircleIcon className="w-3 h-3 mr-1" /> On Hold
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-2">
            {stats.onHold}
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">Pending Audit / Dispute</p>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Inactive</p>
            <Badge variant="outline" className="text-[10px] font-bold border-slate-300 dark:border-slate-700 text-slate-500 px-2 py-0.5">
              Inactive
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-400 tabular-nums mt-2">
            {stats.inactive}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-1">Archived Supplier Accounts</p>
        </Card>
      </div>

      {/* ── 3. MASTER SUPPLIERS LOG CARD ── */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Suppliers Master Directory
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Displaying {filtered.length} registered supplier vendor records
              </CardDescription>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[240px]">
                <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500 text-center">
              <TruckIcon className="w-10 h-10 text-indigo-500/40" />
              <p className="font-bold text-slate-900 dark:text-white">No Suppliers Found</p>
              <p className="text-xs text-slate-500 max-w-sm">
                {statusFilter !== "all"
                  ? `No ${statusFilter} suppliers matching your search criteria`
                  : "Register your first vendor supplier to start tracking fulfillment"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddOpen(true)}
                className="rounded-xl text-xs font-semibold"
              >
                <PlusIcon className="w-3.5 h-3.5 mr-1" /> Add New Supplier
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">Supplier</th>
                    <th className="px-5 py-3.5 font-bold hidden md:table-cell">Contact</th>
                    <th className="px-5 py-3.5 font-bold hidden sm:table-cell text-center">Lead Time</th>
                    <th className="px-5 py-3.5 font-bold hidden lg:table-cell text-center">Orders</th>
                    <th className="px-5 py-3.5 font-bold hidden lg:table-cell text-right">Total Value</th>
                    <th className="px-5 py-3.5 font-bold hidden xl:table-cell text-center">On-Time Rate</th>
                    <th className="px-5 py-3.5 font-bold">Status</th>
                    <th className="px-3 py-3.5 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filtered.map((s) => {
                    const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.active;
                    const StatusIcon = cfg.icon;

                    return (
                      <tr
                        key={s._id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => router.push(`/suppliers/${s._id}`)}
                      >
                        {/* Company Name */}
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                            {s.paymentTerms ?? "No Terms Set"}
                          </p>
                        </td>

                        {/* Contact Info */}
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">{s.email}</p>
                          <p className="text-[11px] text-slate-500 font-medium">{s.phone ?? "—"}</p>
                        </td>

                        {/* Lead Time */}
                        <td className="px-5 py-3.5 hidden sm:table-cell text-center">
                          <Badge variant="outline" className="font-mono text-xs font-bold border-slate-200 dark:border-slate-800">
                            {s.leadTimeDays}d
                          </Badge>
                        </td>

                        {/* Orders */}
                        <td className="px-5 py-3.5 hidden lg:table-cell text-center font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                          {s.totalOrders}
                        </td>

                        {/* Total Value */}
                        <td className="px-5 py-3.5 hidden lg:table-cell text-right font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                          {formatCurrency(s.totalValue)}
                        </td>

                        {/* On-Time Rate */}
                        <td className="px-5 py-3.5 hidden xl:table-cell text-center">
                          {s.onTimeRate !== null ? (
                            <Badge className={`text-xs font-bold px-2 py-0.5 ${
                              s.onTimeRate >= 80
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : s.onTimeRate >= 60
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                  : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                            }`}>
                              {s.onTimeRate}%
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <Badge className={`text-xs font-bold px-2.5 py-0.5 inline-flex items-center gap-1 border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                            {StatusIcon && <StatusIcon className="w-3 h-3" />}
                            <span>{cfg.label}</span>
                          </Badge>
                        </td>

                        {/* Arrow */}
                        <td className="px-3 py-3.5 text-right">
                          <ChevronRightIcon className="w-4 h-4 text-slate-400" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddSupplierDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
