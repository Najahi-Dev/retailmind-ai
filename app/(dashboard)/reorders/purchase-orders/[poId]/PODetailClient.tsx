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
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", color: "bg-blue-500/10 text-blue-500" },
  confirmed: { label: "Confirmed", color: "bg-yellow-500/10 text-yellow-500" },
  shipped: { label: "Shipped", color: "bg-purple-500/10 text-purple-500" },
  delivered: { label: "Delivered", color: "bg-green-500/10 text-green-500" },
  cancelled: {
    label: "Cancelled",
    color: "bg-destructive/10 text-destructive",
  },
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
  const [updating, setUpdating] = useState(false);

  const po = useQuery(api.purchaseOrders.getPODetail, {
    poId: poId as Id<"purchaseOrders">,
  });
  const updateStatus = useMutation(api.purchaseOrders.updatePOStatus);

  const canEdit = ["admin", "manager"].includes(role);

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

  const handleStatusUpdate = async (nextStatus: string) => {
    setUpdating(true);
    try {
      await updateStatus({
        poId: poId as Id<"purchaseOrders">,
        status: nextStatus as any,
      });
      toast.success(`Status updated to ${nextStatus}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
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
      <div className="flex flex-1 items-center justify-center gap-2 p-6 text-muted-foreground">
        <RefreshCwIcon className="animate-spin size-4" />
        Loading...
      </div>
    );
  }

  if (po === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <ShoppingCartIcon className="size-12 text-muted-foreground/40" />
        <p className="font-medium">Purchase order not found</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const nextStatus = NEXT_STATUS[po.status];
  const statusCfg = STATUS_CONFIG[po.status];
  const steps = ["draft", "sent", "confirmed", "shipped", "delivered"];
  const currentIdx = steps.indexOf(po.status);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 @container/main">
      {/* ── Header ────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ChevronLeftIcon className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold font-[Montserrat] tracking-tight">
                {po.poNumber}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}
              >
                {po.status === "delivered" && (
                  <CheckCircleIcon className="size-3" />
                )}
                {po.status === "shipped" && <TruckIcon className="size-3" />}
                {po.status === "cancelled" && (
                  <XCircleIcon className="size-3" />
                )}
                {statusCfg.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {po.supplierName} · Created {formatDate(po.createdAt)}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        {canEdit && po.status !== "delivered" && po.status !== "cancelled" && (
          <div className="flex gap-2 flex-wrap">
            {/* Next status button */}
            {nextStatus && (
              <Button
                size="sm"
                onClick={() => handleStatusUpdate(nextStatus)}
                disabled={updating}
              >
                {updating ? (
                  <RefreshCwIcon className="animate-spin size-4 mr-2" />
                ) : (
                  <CheckCircleIcon className="size-4 mr-2" />
                )}
                {NEXT_LABEL[po.status]}
              </Button>
            )}

            {/* Cancel — AlertDialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  disabled={updating}
                >
                  <XCircleIcon className="size-4 mr-1.5" />
                  Cancel PO
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <XCircleIcon className="size-5 text-destructive" />
                    Cancel Purchase Order
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <span className="block">
                      Are you sure you want to cancel{" "}
                      <span className="font-semibold text-foreground">
                        {po.poNumber}
                      </span>
                      ?
                    </span>
                    <span className="block text-sm">
                      This order from{" "}
                      <span className="font-medium text-foreground">
                        {po.supplierName}
                      </span>{" "}
                      has{" "}
                      <span className="font-medium text-foreground">
                        {po.lineItems.length} item
                        {po.lineItems.length !== 1 ? "s" : ""}
                      </span>{" "}
                      worth{" "}
                      <span className="font-medium text-foreground">
                        {formatCurrency(po.totalValue)}
                      </span>
                      . This action cannot be undone.
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={updating}>
                    Keep Order
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    disabled={updating}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {updating ? (
                      <RefreshCwIcon className="animate-spin size-4 mr-2" />
                    ) : (
                      <XCircleIcon className="size-4 mr-2" />
                    )}
                    Yes, Cancel Order
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* ── Status Timeline ───────────────────── */}
      {po.status !== "cancelled" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 right-0 top-4 h-0.5 bg-muted mx-8" />
              <div
                className="absolute left-0 top-4 h-0.5 bg-primary transition-all mx-8"
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
                      className={`size-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                        done
                          ? "bg-primary border-primary text-primary-foreground"
                          : current
                            ? "bg-background border-primary text-primary"
                            : "bg-background border-muted text-muted-foreground"
                      }`}
                    >
                      {done ? <CheckCircleIcon className="size-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-xs capitalize hidden sm:block ${
                        current
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
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

      {/* ── Cancelled banner ─────────────────── */}
      {po.status === "cancelled" && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <XCircleIcon className="size-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">
              This purchase order has been cancelled
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              No further actions can be taken on this order
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 @xl/main:grid-cols-3">
        {/* ── Line Items ────────────────────── */}
        <div className="@xl/main:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PackageIcon className="size-4 text-muted-foreground" />
                Line Items
              </CardTitle>
              <CardDescription>
                {po.lineItems.length} product
                {po.lineItems.length !== 1 ? "s" : ""} in this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                        Product
                      </th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                        Qty
                      </th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                        Unit Cost
                      </th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.lineItems.map((line, i) => (
                      <tr key={i} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-medium">{line.productName}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {line.productSku}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {line.quantityOrdered}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                          {formatCurrency(line.unitCost)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(line.quantityOrdered * line.unitCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50 border-t">
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-3 text-right font-semibold"
                      >
                        Total Value
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-base">
                        {formatCurrency(po.totalValue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Order Details ─────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "PO Number", value: po.poNumber },
              { label: "Supplier", value: po.supplierName },
              { label: "Status", value: statusCfg.label },
              { label: "Created", value: formatDate(po.createdAt) },
              {
                label: "Delivery",
                value: po.requestedDelivery
                  ? formatDate(po.requestedDelivery)
                  : "Not set",
              },
              { label: "Total", value: formatCurrency(po.totalValue) },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-start justify-between gap-3 py-1.5 border-b border-border/50 last:border-0 text-sm"
              >
                <span className="text-muted-foreground shrink-0">
                  {row.label}
                </span>
                <span className="font-medium text-right">{row.value}</span>
              </div>
            ))}

            {po.notes && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm bg-muted/50 rounded-md p-2">{po.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
