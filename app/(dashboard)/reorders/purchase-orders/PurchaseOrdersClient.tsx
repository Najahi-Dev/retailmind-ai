"use client";
import { useQuery, useMutation } from "convex/react";
import { api }       from "@/convex/_generated/api";
import { Id }        from "@/convex/_generated/dataModel";
import { useState }  from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge }   from "@/components/ui/badge";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCartIcon, TruckIcon, CheckCircleIcon,
  ClockIcon, RefreshCwIcon, PlusIcon,
  ChevronRightIcon, FileTextIcon, SearchIcon, SparklesIcon,
  Building2Icon, CalendarIcon, SendIcon, CheckSquareIcon, PackageCheckIcon, XCircleIcon
} from "lucide-react";
import { toast } from "sonner";
import { InvoiceModal } from "./[poId]/InvoiceModal";

interface Props { role: string }

const STATUS_CONFIG: Record<string, {
  label:   string;
  color:   string;
  bg:      string;
  border:  string;
  icon:    any;
}> = {
  draft:     { label: "Draft",     color: "text-slate-600 dark:text-slate-300",  bg: "bg-slate-100 dark:bg-slate-800",       border: "border-slate-300 dark:border-slate-700",  icon: ClockIcon },
  sent:      { label: "Sent",      color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-500/10 dark:bg-amber-500/15", border: "border-amber-500/30",              icon: ClockIcon },
  confirmed: { label: "Confirmed", color: "text-indigo-600 dark:text-indigo-400",bg: "bg-indigo-500/10 dark:bg-indigo-500/15",border: "border-indigo-500/30",            icon: CheckSquareIcon },
  shipped:   { label: "Shipped",   color: "text-purple-600 dark:text-purple-400",bg: "bg-purple-500/10 dark:bg-purple-500/15",border: "border-purple-500/30",            icon: TruckIcon },
  delivered: { label: "Delivered", color: "text-emerald-600 dark:text-emerald-400",bg:"bg-emerald-500/10 dark:bg-emerald-500/15",border:"border-emerald-500/30",          icon: PackageCheckIcon },
  cancelled: { label: "Cancelled", color: "text-red-600 dark:text-red-400 font-bold",bg:"bg-red-500/10 dark:bg-red-500/15",    border:"border-red-500/30",              icon: XCircleIcon },
};

// What action is available for each status
const NEXT_ACTION: Record<string, {
  label:  string;
  status: string;
  className: string;
} | null> = {
  draft:     { label: "Send to Supplier", status: "sent", className: "bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-0 shadow-xs" },
  sent:      { label: "Mark Confirmed", status: "confirmed", className: "bg-amber-600 hover:bg-amber-700 text-white font-bold border-0 shadow-xs" },
  confirmed: { label: "Mark Shipped", status: "shipped", className: "bg-purple-600 hover:bg-purple-700 text-white font-bold border-0 shadow-xs" },
  shipped:   { label: "Mark Delivered", status: "delivered", className: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-0 shadow-xs" },
  delivered: null,
  cancelled: null,
};

export default function PurchaseOrdersClient({ role }: Props) {
  const router = useRouter();
  const { token } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedInvoicePO, setSelectedInvoicePO] = useState<any | null>(null);

  const orders = useQuery(api.purchaseOrders.getPurchaseOrders, {
    token: token ?? undefined,
    status: statusFilter === "all" ? undefined : (statusFilter as any),
  });
  const stats = useQuery(api.purchaseOrders.getPOStats, {
    token: token ?? undefined,
  });
  const updateStatus = useMutation(api.purchaseOrders.updatePOStatus);

  const isSupplier = role === "supplier";
  const canViewFinancials = ["admin", "manager"].includes(role);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency", currency: "LKR", maximumFractionDigits: 0,
    }).format(val);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", {
      day: "numeric", month: "short", year: "numeric",
    });

  const handleStatusUpdate = async (
    poId: Id<"purchaseOrders">,
    status: string,
  ) => {
    setUpdating(poId);
    try {
      await updateStatus({
        poId,
        token: token ?? undefined,
        status: status as any,
      });
      toast.success(`Purchase Order status updated to ${status}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update status";
      toast.error(message);
    } finally {
      setUpdating(null);
    }
  };

  if (!orders || !stats) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-12 text-slate-500 font-semibold text-xs">
        <RefreshCwIcon className="animate-spin size-4 text-indigo-500" />
        Loading vendor purchase orders...
      </div>
    );
  }

  const filteredOrders = orders.filter((po) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return po.poNumber.toLowerCase().includes(q) || (po.supplierName && po.supplierName.toLowerCase().includes(q));
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full">
      {/* ── 1. HERO HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 text-white p-6 rounded-xl shadow-xl border shadow-lg relative overflow-hidden">
        {/* Glow Ambient Effect */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <ShoppingCartIcon className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Vendor Purchase Orders & Procurement Control
                </h1>
                <Badge className="text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5">
                  Fulfillment Sync Active
                </Badge>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1 max-w-2xl leading-relaxed">
                Manage active vendor purchase orders, delivery status tracking, and inventory replenishment fulfillment.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {!isSupplier && (
              <>
                <Button
                  variant="outline"
                  onClick={() => router.push("/reorders")}
                  className="h-9 rounded-xl text-xs font-semibold text-indigo-200 bg-white/10 hover:bg-white/20 border-white/20 px-4"
                >
                  <SparklesIcon className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> Reorder Suggestions
                </Button>

                <Button
                  onClick={() => router.push("/reorders/purchase-orders/create")}
                  className="h-9 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 shadow-md border-0"
                >
                  <PlusIcon className="w-4 h-4 mr-1.5" /> New PO
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── SUPPLIER PO ALERTS BANNER ── */}
      {isSupplier && stats.sent > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-amber-900 dark:text-amber-100 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ClockIcon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold">Action Required: {stats.sent} New Purchase Order(s) Placed</h4>
                <Badge className="bg-amber-500 text-white font-extrabold text-[10px] px-2 py-0.5">
                  Newly Placed
                </Badge>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5">
                The RetailMind AI store management team has issued new purchase order(s) to your account. Please review items, confirm availability, and mark order status.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              const firstSentPo = orders?.find((po) => po.status === "sent");
              if (firstSentPo) {
                router.push(`/reorders/purchase-orders/${firstSentPo._id}`);
              } else {
                setStatusFilter("sent");
              }
            }}
            className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white border-0 shrink-0 shadow-md"
          >
            Review Placed Orders ({stats.sent})
          </Button>
        </div>
      )}

      {/* ── 2. TOP KPI METRICS ── */}
      {!isSupplier && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Orders</p>
              <Badge variant="outline" className="text-[10px] font-bold border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5">
                <FileTextIcon className="w-3 h-3 mr-1" /> All
              </Badge>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums mt-2">
              {stats.total}
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Total Generated PO Records</p>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">In Progress</p>
              <Badge className="text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5">
                <TruckIcon className="w-3 h-3 mr-1" /> Active
              </Badge>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 tabular-nums mt-2">
              {stats.sent + stats.confirmed + stats.shipped}
            </p>
            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1">Pending Delivery / Shipped</p>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Delivered</p>
              <Badge className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5">
                <CheckCircleIcon className="w-3 h-3 mr-1" /> Done
              </Badge>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-2">
              {stats.delivered}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">Successfully Fulfilled</p>
          </Card>

          {canViewFinancials && (
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Valuation</p>
                <Badge variant="outline" className="text-[10px] font-bold border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 px-2 py-0.5">
                  LKR
                </Badge>
              </div>
              <p className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums mt-2 truncate">
                {formatCurrency(stats.totalValue)}
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Cumulative Procurement Spend</p>
            </Card>
          )}
        </div>
      )}

      {/* ── 3. PURCHASE ORDERS MASTER TABLE CARD ── */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileTextIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Purchase Orders Master Log
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Displaying {filteredOrders.length} purchase order records
              </CardDescription>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px]">
                <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search PO # or supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 p-0">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500 text-center">
              <ShoppingCartIcon className="w-10 h-10 text-indigo-500/40" />
              <p className="font-bold text-slate-900 dark:text-white">No Purchase Orders Found</p>
              <p className="text-xs text-slate-500 max-w-sm">
                {statusFilter !== "all"
                  ? `No ${statusFilter} orders matching query`
                  : "Create your first PO from a reorder suggestion"}
              </p>
              {!isSupplier && statusFilter === "all" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/reorders")}
                  className="rounded-xl text-xs font-semibold"
                >
                  View Reorder Suggestions
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">PO Number</th>
                    <th className="px-5 py-3.5 font-bold hidden sm:table-cell">Supplier</th>
                    <th className="px-5 py-3.5 font-bold">Status</th>
                    <th className="px-5 py-3.5 font-bold hidden lg:table-cell">Payment</th>
                    <th className="px-5 py-3.5 font-bold text-right hidden md:table-cell">Items</th>
                    {canViewFinancials && (
                      <th className="px-5 py-3.5 font-bold text-right hidden lg:table-cell">Total Value</th>
                    )}
                    <th className="px-5 py-3.5 font-bold hidden lg:table-cell">Date</th>
                    <th className="px-5 py-3.5 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredOrders.map((po) => {
                    const statusCfg = STATUS_CONFIG[po.status] ?? STATUS_CONFIG.draft;
                    const nextAction = NEXT_ACTION[po.status];
                    const isUpdating = updating === po._id;
                    const StatusIcon = statusCfg.icon;

                    return (
                      <tr
                        key={po._id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* PO Number */}
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {po.poNumber}
                          </span>
                        </td>

                        {/* Supplier */}
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {po.supplierName}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="px-5 py-3.5">
                          <Badge className={`text-xs font-bold px-2.5 py-0.5 inline-flex items-center gap-1 border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                            {StatusIcon && <StatusIcon className="w-3 h-3" />}
                            <span>{statusCfg.label}</span>
                          </Badge>
                        </td>

                        {/* Payment Status Badge (admin/manager only) */}
                        {canViewFinancials && (
                          <td className="px-5 py-3.5 hidden lg:table-cell">
                            {(po as any).paymentStatus ? (() => {
                              const ps = (po as any).paymentStatus as string;
                              const pmCfg: Record<string, { cls: string; label: string }> = {
                                PAID:                { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", label: "Paid" },
                                paid:                { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", label: "Paid" },
                                PARTIALLY_PAID:      { cls: "bg-amber-500/10 text-amber-600 border-amber-500/20",   label: "Partial" },
                                partial:             { cls: "bg-amber-500/10 text-amber-600 border-amber-500/20",   label: "Partial" },
                                DUE:                 { cls: "bg-red-500/10 text-red-600 border-red-500/20",        label: "DUE" },
                                OVERDUE:             { cls: "bg-red-600/20 text-red-700 border-red-600/30",        label: "OVERDUE" },
                                CHEQUE_PENDING:      { cls: "bg-amber-500/10 text-amber-700 border-amber-500/20",  label: "Cheque Pending" },
                                PENDING_ON_DELIVERY: { cls: "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700", label: "Pending COD" },
                                unpaid:              { cls: "bg-red-500/10 text-red-500 border-red-500/20",        label: "Unpaid" },
                              };
                              const cfg = pmCfg[ps];
                              return cfg ? (
                                <Badge className={`text-[10px] font-bold px-2 py-0.5 border ${cfg.cls}`}>{cfg.label}</Badge>
                              ) : null;
                            })() : <span className="text-xs text-slate-400">—</span>}
                          </td>
                        )}

                        {/* Item Count */}
                        <td className="px-5 py-3.5 text-right hidden md:table-cell text-sm text-slate-600 dark:text-slate-400 font-medium">
                          {po.itemCount} item{po.itemCount !== 1 ? "s" : ""}
                        </td>

                        {/* Total Value */}
                        {canViewFinancials && (
                          <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-white tabular-nums hidden lg:table-cell text-sm">
                            {formatCurrency(po.totalValue)}
                          </td>
                        )}

                        {/* Date */}
                        <td className="px-5 py-3.5 text-xs text-slate-500 font-medium hidden lg:table-cell">
                          {formatDate(po.createdAt)}
                        </td>

                        {/* Action Buttons */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Admin / Manager Action: ONLY "Send to Supplier" for draft POs */}
                            {!isSupplier && po.status === "draft" && (
                              <Button
                                size="sm"
                                disabled={isUpdating}
                                className="h-8 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl px-3.5 border-0 shadow-xs"
                                onClick={() => handleStatusUpdate(po._id, "sent")}
                              >
                                {isUpdating ? (
                                  <RefreshCwIcon className="animate-spin size-3.5" />
                                ) : (
                                  "Send to Supplier"
                                )}
                              </Button>
                            )}

                            {/* Supplier Actions: Update status options (Confirm, Ship, Deliver) */}
                            {isSupplier && (
                              <>
                                {po.status === "sent" && (
                                  <Button
                                    size="sm"
                                    disabled={isUpdating}
                                    className="h-8 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl px-3.5 border-0 shadow-xs"
                                    onClick={() => handleStatusUpdate(po._id, "confirmed")}
                                  >
                                    {isUpdating ? (
                                      <RefreshCwIcon className="animate-spin size-3.5" />
                                    ) : (
                                      "Confirm Order"
                                    )}
                                  </Button>
                                )}

                                {po.status === "confirmed" && (
                                  <Button
                                    size="sm"
                                    disabled={isUpdating}
                                    className="h-8 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl px-3.5 border-0 shadow-xs"
                                    onClick={() => handleStatusUpdate(po._id, "shipped")}
                                  >
                                    {isUpdating ? (
                                      <RefreshCwIcon className="animate-spin size-3.5" />
                                    ) : (
                                      "Mark Shipped"
                                    )}
                                  </Button>
                                )}

                                {po.status === "shipped" && (
                                  <Button
                                    size="sm"
                                    disabled={isUpdating}
                                    className="h-8 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl px-3.5 border-0 shadow-xs"
                                    onClick={() => handleStatusUpdate(po._id, "delivered")}
                                  >
                                    {isUpdating ? (
                                      <RefreshCwIcon className="animate-spin size-3.5" />
                                    ) : (
                                      "Mark Delivered"
                                    )}
                                  </Button>
                                )}
                              </>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedInvoicePO(po)}
                              title="View & Print Invoice"
                              className="size-8 p-0 rounded-xl border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 shrink-0"
                            >
                              <FileTextIcon className="w-4 h-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                router.push(
                                  `/reorders/purchase-orders/${po._id}`,
                                )
                              }
                              className="size-8 p-0 rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                            >
                              <ChevronRightIcon className="w-4 h-4" />
                            </Button>
                          </div>
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

      {/* Quick Invoice Modal */}
      {selectedInvoicePO && (
        <InvoiceModal
          open={!!selectedInvoicePO}
          onOpenChange={(open) => {
            if (!open) setSelectedInvoicePO(null);
          }}
          po={{
            _id: selectedInvoicePO._id,
            poNumber: selectedInvoicePO.poNumber,
            invoiceNumber: selectedInvoicePO.invoiceNumber,
            status: selectedInvoicePO.status,
            createdAt: selectedInvoicePO.createdAt,
            supplierName: selectedInvoicePO.supplierName,
            supplierEmail: selectedInvoicePO.supplierEmail,
            supplierPhone: selectedInvoicePO.supplierPhone,
            supplierAddress: selectedInvoicePO.supplierAddress,
            totalValue: selectedInvoicePO.totalValue,
            lineItems: (selectedInvoicePO.lineItems || []).map((item: any) => ({
              productId: item.productId,
              productName: item.productName || "Purchase Item",
              sku: item.sku || "SKU-ITEM",
              quantityOrdered: item.quantityOrdered,
              unitCost: item.unitCost,
              lineTotal: item.lineTotal ?? item.unitCost * item.quantityOrdered,
            })),
            paymentStatus: selectedInvoicePO.paymentStatus,
          }}
        />
      )}
    </div>
  );
}