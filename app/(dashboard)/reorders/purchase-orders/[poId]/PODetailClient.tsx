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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  FileTextIcon,
  CreditCardIcon,
  BanknoteIcon,
  HandshakeIcon,
  PlusCircleIcon,
  ReceiptIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  FileCheckIcon,
  InfoIcon,
  AlertTriangleIcon,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { InvoiceModal } from "./InvoiceModal";

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
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);

  const po = useQuery(api.purchaseOrders.getPODetail, {
    poId: poId as Id<"purchaseOrders">,
    token: token ?? undefined,
  });
  const payments = useQuery(api.purchaseOrders.getPOPayments, {
    poId: poId as Id<"purchaseOrders">,
    token: token ?? undefined,
  });
  const updateStatus    = useMutation(api.purchaseOrders.updatePOStatus);
  const recordPayment   = useMutation(api.purchaseOrders.recordPOPayment);
  const setPayMethodMutation = useMutation(api.purchaseOrders.setPOPaymentMethod);
  const updateChequeStatus = useMutation(api.purchaseOrders.updateChequeStatus);
  const createAlert = useMutation(api.alerts.createAlert);
  const [updatingCheque, setUpdatingCheque] = useState(false);
  const [codAmount, setCodAmount] = useState("");
  const [collectingCod, setCollectingCod] = useState(false);

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

  const handleRecordPayment = async () => {
    if (!paymentMethod) { toast.error("Select a payment method first."); return; }
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid payment amount."); return; }
    setRecordingPayment(true);
    try {
      const res = await recordPayment({
        token: token ?? undefined,
        poId: poId as Id<"purchaseOrders">,
        method: paymentMethod as any,
        amount,
        reference: paymentRef || undefined,
        notes: paymentNotes || undefined,
      });
      toast.success(`Payment of ${formatCurrency(amount)} recorded. Status: ${res?.paymentStatus ?? "updated"}.`);
      setPaymentAmount("");
      setPaymentRef("");
      setPaymentNotes("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to record payment");
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleCollectCod = async () => {
    if (!po) return;
    const amount = parseFloat(codAmount) || Math.max(0, po.totalValue - ((po as any).amountPaid ?? 0));
    if (amount <= 0) { toast.error("Enter a valid COD amount."); return; }
    
    setCollectingCod(true);
    try {
      const res = await recordPayment({
        token: token ?? undefined,
        poId: poId as Id<"purchaseOrders">,
        method: "CASH_ON_DELIVERY",
        amount,
        notes: "Collected by Supplier upon delivery",
      });
      
      // Notify Admin
      await createAlert({
        token: token ?? undefined,
        type: "system",
        priority: "high",
        message: `Payment received and Order delivered successfully for PO ${po.poNumber}. Amount collected: ${formatCurrency(amount)}`,
      });
      
      toast.success(`Payment of ${formatCurrency(amount)} received.`);
      setCodAmount("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to record COD payment");
    } finally {
      setCollectingCod(false);
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

  const isPaid = (po as any).paymentStatus === "PAID" || (po as any).paymentStatus === "paid";

  const nextStatus = NEXT_STATUS[po.status];
  const statusCfg = STATUS_CONFIG[po.status] ?? STATUS_CONFIG.draft;
  const steps = ["draft", "sent", "confirmed", "shipped", "delivered"];
  const currentIdx = steps.indexOf(po.status);

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full">
      {/* ── 1. HERO HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 text-white p-6 rounded-xl shadow-xl border shadow-lg relative overflow-hidden">
        {/* Glow Ambient Effect */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

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

                {/* Payment status badge */}
                {(po as any).paymentStatus && (() => {
                  const ps = (po as any).paymentStatus as string;
                  const psConfig: Record<string, { bg: string; color: string; border: string; label: string }> = {
                    PAID:               { bg: "bg-emerald-500/10", color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20", label: "Paid" },
                    PARTIALLY_PAID:     { bg: "bg-amber-500/10",  color: "text-amber-600 dark:text-amber-400",   border: "border-amber-500/20",  label: "Partial Payment" },
                    DUE:                { bg: "bg-red-500/10",    color: "text-red-500",                          border: "border-red-500/20",    label: "DUE" },
                    OVERDUE:            { bg: "bg-red-600/15",    color: "text-red-600 dark:text-red-400",       border: "border-red-600/30",    label: "OVERDUE" },
                    CHEQUE_PENDING:     { bg: "bg-amber-500/10", color: "text-amber-600 dark:text-amber-400",    border: "border-amber-500/20",  label: "Cheque Pending" },
                    PENDING_ON_DELIVERY:{ bg: "bg-slate-100 dark:bg-slate-800", color: "text-slate-600 dark:text-slate-300", border: "border-slate-300 dark:border-slate-700", label: "Pending on Delivery" },
                    // Legacy
                    paid:    { bg: "bg-emerald-500/10", color: "text-emerald-600", border: "border-emerald-500/20", label: "Paid" },
                    partial: { bg: "bg-amber-500/10",  color: "text-amber-600",   border: "border-amber-500/20",  label: "Partial" },
                    unpaid:  { bg: "bg-red-500/10",    color: "text-red-500",     border: "border-red-500/20",    label: "Unpaid" },
                  };
                  const cfg = psConfig[ps] ?? psConfig.unpaid;
                  return (
                    <Badge className={`text-xs font-bold px-2.5 py-0.5 border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                      {(ps === "PAID" || ps === "paid") && <CheckCircle2Icon className="w-3.5 h-3.5 mr-1" />}
                      {(ps === "PARTIALLY_PAID" || ps === "partial") && <CircleAlertIcon className="w-3.5 h-3.5 mr-1" />}
                      {(ps === "DUE" || ps === "OVERDUE" || ps === "unpaid") && <BanknoteIcon className="w-3.5 h-3.5 mr-1" />}
                      {ps === "CHEQUE_PENDING" && <FileCheckIcon className="w-3.5 h-3.5 mr-1" />}
                      {cfg.label}
                    </Badge>
                  );
                })()}
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

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowInvoiceModal(true)}
              className="h-9 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border-white/20 px-3.5 shadow-sm"
            >
              <FileTextIcon className="size-4 mr-1.5 text-indigo-300" />
              View / Print Invoice
            </Button>

            {canEdit && (po.status === "draft" || po.status === "sent") && (
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
            <div className="flex items-center justify-between relative sm:max-w-4xl w-[95vw] sm:w-full mx-auto py-2">
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
        <div className="space-y-5">
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

          {/* ── CHEQUE DETAILS CARD ── */}
          {(po as any).paymentMethod === "CHEQUE" && (
            <Card className="bg-white dark:bg-slate-900 border-amber-400/30 rounded-xl shadow-sm overflow-hidden">
              <CardHeader className="border-b border-amber-100 dark:border-amber-900/30 pb-3 bg-amber-50/50 dark:bg-amber-950/20">
                <CardTitle className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <FileCheckIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Cheque Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5">
                {[
                  { label: "Cheque #",  value: (po as any).chequeNumber ?? "—", mono: true },
                  { label: "Bank",      value: (po as any).bankName ?? "—",      mono: false },
                  { label: "Amount",    value: (po as any).chequeAmount ? formatCurrency((po as any).chequeAmount) : formatCurrency(po.totalValue), mono: false },
                  { label: "Date",      value: (po as any).chequeDate ? formatDate((po as any).chequeDate) : "—",    mono: false },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800/60 last:border-0 py-1.5">
                    <span className="text-slate-500 font-medium">{row.label}</span>
                    <span className={`font-bold text-slate-900 dark:text-white ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
                  </div>
                ))}

                {/* Cheque Status + toggle */}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Cheque Status</span>
                  <Badge className={`text-xs font-bold px-2.5 py-0.5 ${
                    (po as any).chequeStatus === "CLEARED" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : (po as any).chequeStatus === "BOUNCED" ? "bg-red-500/10 text-red-600 border-red-500/20"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  }`}>
                    {(po as any).chequeStatus ?? "ISSUED"}
                  </Badge>
                </div>

                {canEdit && (po as any).chequeStatus !== "CLEARED" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      disabled={updatingCheque}
                      onClick={async () => {
                        setUpdatingCheque(true);
                        try {
                          await updateChequeStatus({ token: token ?? undefined, poId: poId as Id<"purchaseOrders">, chequeStatus: "CLEARED" });
                          toast.success("Cheque marked as Cleared — PO marked as Paid.");
                        } catch (e: any) { toast.error(e?.message || "Failed to update cheque status"); }
                        finally { setUpdatingCheque(false); }
                      }}
                      className="flex-1 h-8 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                    >
                      {updatingCheque ? <RefreshCwIcon className="size-3.5 animate-spin" /> : <CheckCircleIcon className="size-3.5 mr-1.5" />}
                      Mark Cheque as Cleared
                    </Button>
                    {(po as any).chequeStatus !== "BOUNCED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingCheque}
                        onClick={async () => {
                          setUpdatingCheque(true);
                          try {
                            await updateChequeStatus({ token: token ?? undefined, poId: poId as Id<"purchaseOrders">, chequeStatus: "BOUNCED" });
                            toast.warning("Cheque marked as Bounced — PO set to DUE.");
                          } catch (e: any) { toast.error(e?.message || "Failed"); }
                          finally { setUpdatingCheque(false); }
                        }}
                        className="h-8 text-xs font-bold rounded-lg border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 px-3"
                      >
                        Mark Bounced
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── CREDIT DUE BADGE CARD ── */}
          {((po as any).paymentMethod === "CREDIT" || (po as any).paymentStatus === "DUE" || (po as any).paymentStatus === "OVERDUE") && (
            <Card className="bg-white dark:bg-slate-900 border-blue-400/30 rounded-xl shadow-sm overflow-hidden">
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <InfoIcon className="size-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-blue-800 dark:text-blue-300">Outstanding Payable Liability</p>
                    <p className="text-xs text-slate-500 font-medium">This order is logged as an accounts payable balance.</p>
                  </div>
                </div>
                {(po as any).dueDate && (() => {
                  const daysLeft = Math.ceil(((po as any).dueDate - Date.now()) / 86400000);
                  const isOverdue = daysLeft < 0;
                  return (
                    <div className={`flex items-center justify-between p-3 rounded-lg border text-xs font-bold ${
                      isOverdue
                        ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                        : daysLeft <= 7
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                        : "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                    }`}>
                      <span className="flex items-center gap-1.5">
                        <ClockIcon className="size-3.5" />
                        {isOverdue ? `Overdue by ${Math.abs(daysLeft)} day(s)` : `Due in ${daysLeft} day(s)`}
                      </span>
                      <span>{formatDate((po as any).dueDate)}</span>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── PAYMENT SECTION ── */}
      {canEdit && !isPaid && (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
                <CreditCardIcon className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                  Payment
                  {(po as any).paymentStatus && (
                    <Badge className={`text-xs font-bold px-2.5 py-0.5 border ${
                      (po as any).paymentStatus === "paid"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : (po as any).paymentStatus === "partial"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : "bg-red-500/10 text-red-500 border-red-500/20"
                    }`}>
                      {(po as any).paymentStatus === "paid" ? "Fully Paid" : (po as any).paymentStatus === "partial" ? "Partial" : "Unpaid"}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Record payments and track payment history for this PO
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* Payment Summary Bar */}
            {(po as any).totalValue > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { label: "Total Value", value: formatCurrency(po.totalValue), color: "text-slate-900 dark:text-white" },
                  { label: "Amount Paid", value: formatCurrency((po as any).amountPaid ?? 0), color: "text-emerald-600 dark:text-emerald-400" },
                  { label: "Balance Due", value: formatCurrency(Math.max(0, po.totalValue - ((po as any).amountPaid ?? 0))), color: "text-red-600 dark:text-red-400" },
                ].map((stat) => (
                  <div key={stat.label} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className={`text-base font-extrabold tabular-nums ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Payment Status Badge if set */}
            {(po as any).paymentStatus && (
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Status:</span>
                <Badge className={`text-xs font-bold px-2.5 py-0.5 border ${
                  (po as any).paymentStatus === "PAID" || (po as any).paymentStatus === "paid"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : (po as any).paymentStatus === "CHEQUE_PENDING"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : (po as any).paymentStatus === "DUE" || (po as any).paymentStatus === "OVERDUE"
                    ? "bg-red-500/10 text-red-600 border-red-500/20"
                    : (po as any).paymentStatus === "PARTIALLY_PAID" || (po as any).paymentStatus === "partial"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                }`}>
                  {(po as any).paymentStatus === "PAID" || (po as any).paymentStatus === "paid" ? "Fully Paid"
                    : (po as any).paymentStatus === "CHEQUE_PENDING" ? "Cheque Pending"
                    : (po as any).paymentStatus === "DUE" ? "DUE"
                    : (po as any).paymentStatus === "OVERDUE" ? "OVERDUE"
                    : (po as any).paymentStatus === "PARTIALLY_PAID" || (po as any).paymentStatus === "partial" ? "Partial"
                    : (po as any).paymentStatus === "PENDING_ON_DELIVERY" ? "Pending on Delivery"
                    : (po as any).paymentStatus}
                </Badge>
              </div>
            )}

            {/* Record New Payment Form */}
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Record New Payment</p>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: "CASH_ON_DELIVERY", label: "Cash on Delivery", icon: BanknoteIcon,  color: "emerald" },
                  { value: "CHEQUE",           label: "Cheque Payment",   icon: FileCheckIcon, color: "amber"   },
                  { value: "CREDIT",           label: "Credit / AP",      icon: HandshakeIcon, color: "blue"    },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = paymentMethod === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPaymentMethod(opt.value)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? `border-${opt.color}-500 bg-${opt.color}-50 dark:bg-${opt.color}-950/30`
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        isSelected
                          ? `bg-${opt.color}-500 text-white`
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}>
                        <Icon className="size-4" />
                      </div>
                      <span className={`text-xs font-bold ${
                        isSelected ? `text-${opt.color}-700 dark:text-${opt.color}-300` : "text-slate-700 dark:text-slate-300"
                      }`}>{opt.label}</span>
                      {isSelected && <CheckCircle2Icon className={`size-4 ml-auto text-${opt.color}-500`} />}
                    </button>
                  );
                })}
              </div>

              {/* Amount + Reference + Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Payment Amount (LKR)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={`e.g. ${po.totalValue}`}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="h-10 text-sm rounded-xl border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Reference / Receipt No. <span className="text-slate-400 font-normal">(Optional)</span></Label>
                  <Input
                    placeholder="e.g. TXN-2024-001, RCPT-445"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="h-10 text-sm rounded-xl border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Notes <span className="text-slate-400 font-normal">(Optional)</span></Label>
                <Textarea
                  placeholder="Add payment notes, card last 4 digits, bank transfer details..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={2}
                  className="text-xs rounded-xl border-slate-200 dark:border-slate-700 resize-none"
                />
              </div>

              <Button
                onClick={handleRecordPayment}
                disabled={recordingPayment || !paymentMethod || !paymentAmount}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl gap-2"
              >
                {recordingPayment ? (
                  <><RefreshCwIcon className="size-4 animate-spin" /> Recording...</>
                ) : (
                  <><PlusCircleIcon className="size-4" /> Record Payment</>
                )}
              </Button>
            </div>

            {/* Payment History Table */}
            {payments && payments.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <ReceiptIcon className="size-3.5" /> Payment History ({payments.length})
                </p>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Date</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Method</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Reference</th>
                        <th className="px-4 py-3 text-right font-bold text-slate-600 dark:text-slate-300">Amount</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300 hidden sm:table-cell">By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {payments.map((p) => (
                        <tr key={p._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 text-slate-500 tabular-nums">
                            {new Date(p.paidAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`text-[11px] font-bold px-2 py-0.5 ${
                              p.method === "CASH_ON_DELIVERY" || p.method === "cash_on_delivery"
                                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                : p.method === "CHEQUE"
                                ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                                : p.method === "CREDIT" || p.method === "credit"
                                ? "bg-blue-500/10 text-blue-700 border-blue-500/20"
                                : "bg-violet-500/10 text-violet-700 border-violet-500/20"
                            }`}>
                              {p.method === "CASH_ON_DELIVERY" || p.method === "cash_on_delivery" ? "COD"
                                : p.method === "CHEQUE" ? "Cheque"
                                : (p.method === "CREDIT" || p.method === "credit") ? "Credit"
                                : "Card"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono">{p.reference || "—"}</td>
                          <td className="px-4 py-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{(p as any).recordedByName}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-600 dark:text-slate-300">Total Paid</td>
                        <td className="px-4 py-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatCurrency(payments.reduce((s, p) => s + p.amount, 0))}
                        </td>
                        <td className="hidden sm:table-cell" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── SUPPLIER COLLECT COD SECTION ── */}
      {isSupplier && po.status === "delivered" && ((po as any).paymentMethod === "CASH_ON_DELIVERY" || (po as any).paymentMethod === "cash_on_delivery") && !isPaid && (
        <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="border-b border-emerald-100 dark:border-emerald-900/30 pb-4 bg-emerald-100/50 dark:bg-emerald-900/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
                <BanknoteIcon className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-emerald-900 dark:text-emerald-400 flex items-center gap-2.5">
                  Confirm COD Payment
                </CardTitle>
                <CardDescription className="text-xs text-emerald-700 dark:text-emerald-500 mt-0.5">
                  Record the cash received from the supermarket upon delivery.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Amount Received (LKR)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={`Default: ${formatCurrency(Math.max(0, po.totalValue - ((po as any).amountPaid ?? 0)))}`}
                    value={codAmount}
                    onChange={(e) => setCodAmount(e.target.value)}
                    className="h-10 text-sm rounded-xl border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
              <Button
                onClick={handleCollectCod}
                disabled={collectingCod}
                className="w-full sm:w-auto h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl gap-2 px-6 shadow-md"
              >
                {collectingCod ? (
                  <><RefreshCwIcon className="size-4 animate-spin" /> Recording...</>
                ) : (
                  <><CheckCircleIcon className="size-4" /> Payment Received</>
                )}
              </Button>
          </CardContent>
        </Card>
      )}

      {/* Invoice Modal */}
      {po && (
        <InvoiceModal
          open={showInvoiceModal}
          onOpenChange={setShowInvoiceModal}
          po={{
            _id: po._id,
            poNumber: po.poNumber,
            invoiceNumber: (po as any).invoiceNumber,
            status: po.status,
            createdAt: po.createdAt,
            supplierName: po.supplierName,
            supplierEmail: (po as any).supplierEmail,
            supplierPhone: (po as any).supplierPhone,
            supplierAddress: (po as any).supplierAddress,
            totalValue: po.totalValue,
            paymentMethod: (po as any).paymentMethod,
            paymentStatus: (po as any).paymentStatus,
            amountPaid: (po as any).amountPaid,
            lineItems: po.lineItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              sku: (item as any).productSku || (item as any).sku || "SKU-ITEM",
              quantityOrdered: item.quantityOrdered,
              unitCost: item.unitCost,
              lineTotal: item.lineTotal ?? item.unitCost * item.quantityOrdered,
            })),
          }}
        />
      )}
    </div>
  );
}
