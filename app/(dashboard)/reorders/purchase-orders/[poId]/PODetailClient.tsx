// app/(dashboard)/reorders/purchase-orders/[poId]/PODetailClient.tsx
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
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
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeftIcon,
  RefreshCwIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  TruckIcon,
  PackageIcon,
  XCircleIcon,
  Building2Icon,
  CalendarIcon,
  SendIcon,
  CheckSquareIcon,
  PackageCheckIcon,
  ClockIcon,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  draft: { label: "Draft", bg: "bg-slate-100 dark:bg-slate-800", color: "text-slate-600 dark:text-slate-300", border: "border-slate-300 dark:border-slate-700" },
  sent: { label: "Sent", bg: "bg-blue-500/10", color: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  confirmed: { label: "Confirmed", bg: "bg-amber-500/10", color: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  shipped: { label: "Shipped", bg: "bg-purple-500/10", color: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20" },
  delivered: { label: "Delivered", bg: "bg-emerald-500/10", color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  cancelled: { label: "Cancelled", bg: "bg-red-500/10", color: "text-red-600 dark:text-red-400", border: "border-red-500/20" },
};

const NEXT_STATUS: Record<string, string | null> = {
  draft: "sent",
  sent: "confirmed",
  confirmed: "shipped",
  shipped: "delivered",
  delivered: null,
  cancelled: null,
};

const NEXT_LABEL: Record<string, string> = {
  draft: "Send to Supplier",
  sent: "Mark Confirmed",
  confirmed: "Mark Shipped",
  shipped: "Mark Delivered",
};

export default function PODetailClient({
  poId,
  role,
}: {
  poId: string;
  role: string;
}) {
  const router = useRouter();
  const { token } = useAuth();
  const [updating, setUpdating] = useState(false);

  const po = useQuery(api.purchaseOrders.getPODetail, {
    poId: poId as Id<"purchaseOrders">,
    token: token ?? undefined,
  });
  const updateStatus = useMutation(api.purchaseOrders.updatePOStatus);

  const isSupplier = role === "supplier";
  const canEdit = ["admin", "manager"].includes(role);
  const canUpdateFulfillment = canEdit || (isSupplier && ["sent", "confirmed", "shipped"].includes(po?.status ?? ""));

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(val);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const handleStatusUpdate = async (status: string) => {
    setUpdating(true);
    try {
      await updateStatus({
        poId: poId as Id<"purchaseOrders">,
        token: token ?? undefined,
        status: status as any,
      });
      toast.success(`PO status updated to ${status}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update PO status");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    setUpdating(true);
    try {
      await updateStatus({
        poId: poId as Id<"purchaseOrders">,
        status: "cancelled",
      });
      toast.success("Purchase order cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setUpdating(false);
    }
  };

  if (po === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-12 text-slate-500 font-semibold text-xs">
        <RefreshCwIcon className="animate-spin size-4 text-indigo-500" />
        Loading purchase order specifications...
      </div>
    );
  }

  if (po === null) {
    if (isSupplier) {
      router.replace("/access-denied");
      return null;
    }
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-slate-500">
        <ShoppingCartIcon className="size-10 text-indigo-500/40" />
        <p className="font-bold text-slate-900 dark:text-white">Purchase Order Not Found</p>
        <Button variant="outline" onClick={() => router.back()} className="rounded-xl text-xs font-semibold">
          Return to Purchase Orders
        </Button>
      </div>
    );
  }

  const nextStatus = NEXT_STATUS[po.status];
  const statusCfg = STATUS_CONFIG[po.status] ?? STATUS_CONFIG.draft;
  const steps = ["draft", "sent", "confirmed", "shipped", "delivered"];
  const currentIdx = steps.indexOf(po.status);

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full">
      {/* ── 1. HERO HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
        {/* Glow Ambient Effect */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0 size-10 rounded-lg bg-white/10 hover:bg-white/20 border-white/20 text-white"
            >
              <ChevronLeftIcon className="w-5 h-5 text-indigo-200" />
            </Button>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-mono font-bold text-white tracking-tight">
                  {po.poNumber}
                </h1>
                <Badge className={`text-xs font-bold px-2.5 py-0.5 border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                  {po.status === "delivered" && <PackageCheckIcon className="w-3.5 h-3.5 mr-1" />}
                  {po.status === "shipped" && <TruckIcon className="w-3.5 h-3.5 mr-1" />}
                  {po.status === "confirmed" && <CheckSquareIcon className="w-3.5 h-3.5 mr-1" />}
                  {po.status === "sent" && <ClockIcon className="w-3.5 h-3.5 mr-1" />}
                  {po.status === "cancelled" && <XCircleIcon className="w-3.5 h-3.5 mr-1" />}
                  {statusCfg.label}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Supplier: <strong className="text-white">{po.supplierName}</strong> • Created {formatDate(po.createdAt)}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Admin / Manager Action: ONLY "Send to Supplier" for draft POs */}
            {!isSupplier && po.status === "draft" && (
              <Button
                size="sm"
                onClick={() => handleStatusUpdate("sent")}
                disabled={updating}
                className="h-9 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 shadow-md border-0"
              >
                {updating ? (
                  <RefreshCwIcon className="animate-spin size-4 mr-1.5" />
                ) : (
                  <SendIcon className="size-4 mr-1.5" />
                )}
                Send to Supplier
              </Button>
            )}

            {/* Supplier Actions: Update status options (Confirm, Ship, Deliver) */}
            {isSupplier && (
              <>
                {po.status === "sent" && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusUpdate("confirmed")}
                    disabled={updating}
                    className="h-9 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 px-4 shadow-md border-0"
                  >
                    {updating ? (
                      <RefreshCwIcon className="animate-spin size-4 mr-1.5" />
                    ) : (
                      <CheckCircleIcon className="size-4 mr-1.5" />
                    )}
                    Confirm Order
                  </Button>
                )}

                {po.status === "confirmed" && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusUpdate("shipped")}
                    disabled={updating}
                    className="h-9 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 px-4 shadow-md border-0"
                  >
                    {updating ? (
                      <RefreshCwIcon className="animate-spin size-4 mr-1.5" />
                    ) : (
                      <TruckIcon className="size-4 mr-1.5" />
                    )}
                    Mark Shipped
                  </Button>
                )}

                {po.status === "shipped" && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusUpdate("delivered")}
                    disabled={updating}
                    className="h-9 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-4 shadow-md border-0"
                  >
                    {updating ? (
                      <RefreshCwIcon className="animate-spin size-4 mr-1.5" />
                    ) : (
                      <PackageCheckIcon className="size-4 mr-1.5" />
                    )}
                    Mark Delivered
                  </Button>
                )}
              </>
            )}

              {canEdit && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-xl text-xs font-bold text-red-300 bg-red-500/10 hover:bg-red-500/20 border-red-500/30 px-3"
                    disabled={updating}
                  >
                    <XCircleIcon className="size-4 mr-1.5" />
                    Cancel PO
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent className="rounded-xl border-slate-200 dark:border-slate-800">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                      <XCircleIcon className="size-5" />
                      Cancel Purchase Order?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-slate-500 space-y-2">
                      <span className="block">
                        Are you sure you want to cancel{" "}
                        <strong className="text-slate-900 dark:text-white font-mono">
                          {po.poNumber}
                        </strong>
                        ?
                      </span>
                      <span className="block">
                        This order from <strong>{po.supplierName}</strong> contains{" "}
                        <strong>{po.lineItems.length} item(s)</strong> valued at{" "}
                        <strong className="text-indigo-600 dark:text-indigo-400">{formatCurrency(po.totalValue)}</strong>. This action cannot be undone.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={updating} className="rounded-xl text-xs font-semibold">
                      Keep Order Active
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancel}
                      disabled={updating}
                      className="rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 border-0"
                    >
                      {updating ? (
                        <RefreshCwIcon className="animate-spin size-4 mr-1.5" />
                      ) : (
                        <XCircleIcon className="size-4 mr-1.5" />
                      )}
                      Yes, Cancel Purchase Order
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              )}
            </div>
        </div>
      </div>

      {/* ── 2. ORDER LIFECYCLE TIMELINE ── */}
      {po.status !== "cancelled" && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <CardContent className="pt-2 pb-2">
            <div className="flex items-center justify-between relative max-w-4xl mx-auto py-2">
              <div className="absolute left-6 right-6 top-6 h-1 bg-slate-100 dark:bg-slate-800" />
              <div
                className="absolute left-6 top-6 h-1 bg-indigo-600 transition-all duration-300"
                style={{
                  width: `${Math.max(0, (currentIdx / (steps.length - 1)) * 100)}%`,
                }}
              />
              {steps.map((step, idx) => {
                const done = idx < currentIdx;
                const current = idx === currentIdx;
                return (
                  <div
                    key={step}
                    className="flex flex-col items-center gap-2 z-10"
                  >
                    <div
                      className={`size-9 rounded-lg flex items-center justify-center text-xs font-bold border-2 transition-all shadow-xs ${
                        done
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : current
                            ? "bg-white dark:bg-slate-900 border-indigo-600 text-indigo-600 dark:text-indigo-400 size-10"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400"
                      }`}
                    >
                      {done ? <CheckCircleIcon className="size-4 text-white" /> : idx + 1}
                    </div>
                    <span
                      className={`text-xs capitalize font-bold ${
                        current
                          ? "text-indigo-600 dark:text-indigo-400 font-extrabold"
                          : done
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-400"
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancelled Banner */}
      {po.status === "cancelled" && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs font-medium">
          <XCircleIcon className="size-5 text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <p className="font-bold text-red-600 dark:text-red-400">
              This Purchase Order Has Been Cancelled
            </p>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">
              No further inventory status actions can be performed on this order record.
            </p>
          </div>
        </div>
      )}

      {/* ── 3. TWO COLUMN PO DETAILS GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column — Line Items */}
        <div className="lg:col-span-2">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PackageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Line Items
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {po.lineItems.length} product item(s) included in this purchase order
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200">
                    <tr>
                      <th className="px-5 py-3 font-bold">Product</th>
                      <th className="px-5 py-3 font-bold text-center">Qty</th>
                      <th className="px-5 py-3 font-bold text-right hidden sm:table-cell">Unit Cost</th>
                      <th className="px-5 py-3 font-bold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {po.lineItems.map((line, i) => (
                      <tr key={i} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-900 dark:text-white">{line.productName}</p>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                            SKU: {line.productSku}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-900 dark:text-white tabular-nums">
                          {line.quantityOrdered}
                        </td>
                        <td className="px-5 py-3.5 text-right text-slate-500 font-medium hidden sm:table-cell tabular-nums">
                          {formatCurrency(line.unitCost)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                          {formatCurrency(line.quantityOrdered * line.unitCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <td colSpan={3} className="px-5 py-3.5 text-right font-bold text-slate-700 dark:text-slate-300">
                        Total Value
                      </td>
                      <td className="px-5 py-3.5 text-right font-extrabold text-base text-indigo-600 dark:text-indigo-400 tabular-nums">
                        {formatCurrency(po.totalValue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Order Details Card */}
        <div>
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {[
                { label: "PO Number", value: po.poNumber, isMono: true },
                { label: "Supplier", value: po.supplierName, isMono: false },
                { label: "Status", value: statusCfg.label, isMono: false },
                { label: "Created", value: formatDate(po.createdAt), isMono: false },
                {
                  label: "Delivery",
                  value: po.requestedDelivery ? formatDate(po.requestedDelivery) : "Not set",
                  isMono: false,
                },
                { label: "Total", value: formatCurrency(po.totalValue), isBold: true },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0 text-xs"
                >
                  <span className="text-slate-500 font-medium">{row.label}</span>
                  <span
                    className={`text-right ${
                      row.isBold
                        ? "font-extrabold text-indigo-600 dark:text-indigo-400"
                        : "font-bold text-slate-900 dark:text-white"
                    } ${row.isMono ? "font-mono" : ""}`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}

              {po.notes && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fulfillment Notes</p>
                  <p className="text-xs bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-slate-700 dark:text-slate-300 font-medium border border-slate-200/60 dark:border-slate-800">
                    {po.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
