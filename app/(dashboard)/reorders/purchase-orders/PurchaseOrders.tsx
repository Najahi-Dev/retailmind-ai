"use client";
import { useQuery, useMutation } from "convex/react";
import { api }       from "@/convex/_generated/api";
import { Id }        from "@/convex/_generated/dataModel";
import { useState }  from "react";
import { useRouter } from "next/navigation";
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle, CardAction,
} from "@/components/ui/card";
import { Badge }   from "@/components/ui/badge";
import { Button }  from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCartIcon, TruckIcon, CheckCircleIcon,
  ClockIcon, RefreshCwIcon, PlusIcon,
  ChevronRightIcon, FileTextIcon,
} from "lucide-react";

interface Props { role: string }

const STATUS_CONFIG: Record<string, {
  label:   string;
  color:   string;
  bg:      string;
}> = {
  draft:     { label: "Draft",     color: "text-muted-foreground", bg: "bg-muted"           },
  sent:      { label: "Sent",      color: "text-blue-500",         bg: "bg-blue-500/10"     },
  confirmed: { label: "Confirmed", color: "text-yellow-500",       bg: "bg-yellow-500/10"   },
  shipped:   { label: "Shipped",   color: "text-purple-500",       bg: "bg-purple-500/10"   },
  delivered: { label: "Delivered", color: "text-green-500",        bg: "bg-green-500/10"    },
  cancelled: { label: "Cancelled", color: "text-destructive",      bg: "bg-destructive/10"  },
};

// What action is available for each status
const NEXT_ACTION: Record<string, {
  label:  string;
  status: string;
  variant: "default" | "outline";
} | null> = {
  draft:     { label: "Send to Supplier",   status: "sent",      variant: "default"  },
  sent:      { label: "Mark Confirmed",     status: "confirmed", variant: "default"  },
  confirmed: { label: "Mark Shipped",       status: "shipped",   variant: "default"  },
  shipped:   { label: "Mark Delivered",     status: "delivered", variant: "default"  },
  delivered: null,
  cancelled: null,
};

export default function PurchaseOrdersClient({ role }: Props) {
  const router       = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updating,     setUpdating]     = useState<string | null>(null);

  const orders     = useQuery(api.purchaseOrders.getPurchaseOrders, {
    status: statusFilter === "all" ? undefined : statusFilter as any,
  });
  const stats      = useQuery(api.purchaseOrders.getPOStats);
  const updateStatus = useMutation(api.purchaseOrders.updatePOStatus);

  const isSupplier        = role === "supplier";
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
    status: string
  ) => {
    setUpdating(poId);
    try {
      await updateStatus({ poId, status: status as any });
    } finally {
      setUpdating(null);
    }
  };

  if (!orders || !stats) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-6 text-muted-foreground">
        <RefreshCwIcon className="animate-spin size-4" />
        Loading purchase orders...
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 @container/main">

      {/* ── KPI Cards ─────────────────────────── */}
      {!isSupplier && (
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
              <CardDescription>Total Orders</CardDescription>
              <CardTitle className="text-2xl font-bold tabular-nums">
                {stats.total}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <FileTextIcon className="size-3" /> All
                </Badge>
              </CardAction>
            </CardHeader>
          </Card>

          <Card className="@container/card">
            <CardHeader>
              <CardDescription>In Progress</CardDescription>
              <CardTitle className="text-2xl font-bold tabular-nums text-blue-500">
                {stats.sent + stats.confirmed + stats.shipped}
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="text-blue-500 border-blue-200">
                  <TruckIcon className="size-3" /> Active
                </Badge>
              </CardAction>
            </CardHeader>
          </Card>

          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Delivered</CardDescription>
              <CardTitle className="text-2xl font-bold tabular-nums text-green-500">
                {stats.delivered}
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="text-green-500 border-green-200">
                  <CheckCircleIcon className="size-3" /> Done
                </Badge>
              </CardAction>
            </CardHeader>
          </Card>

          {canViewFinancials && (
            <Card className="@container/card">
              <CardHeader>
                <CardDescription>Total Value</CardDescription>
                <CardTitle className="text-lg font-bold tabular-nums">
                  {formatCurrency(stats.totalValue)}
                </CardTitle>
                <CardAction>
                  <Badge variant="outline">LKR</Badge>
                </CardAction>
              </CardHeader>
            </Card>
          )}
        </div>
      )}

      {/* ── Orders List ───────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">Purchase Orders</CardTitle>
              <CardDescription>
                {orders.length} orders
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Status filter */}
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-36">
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

              {/* Create PO — admin/manager only */}
              {!isSupplier && (
                <Button
                  size="sm"
                  onClick={() => router.push("/reorders/purchase-orders/create")}
                >
                  <PlusIcon className="size-4 mr-1" />
                  New PO
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <ShoppingCartIcon className="size-10 opacity-40" />
              <p className="font-medium">No purchase orders found</p>
              <p className="text-sm">
                {statusFilter !== "all"
                  ? `No ${statusFilter} orders`
                  : "Create your first PO from a reorder suggestion"}
              </p>
              {!isSupplier && statusFilter === "all" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/reorders")}
                >
                  View Reorder Suggestions
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      PO Number
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                      Supplier
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                      Items
                    </th>
                    {canViewFinancials && (
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                        Total Value
                      </th>
                    )}
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                      Date
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((po) => {
                    const statusCfg = STATUS_CONFIG[po.status];
                    const nextAction = NEXT_ACTION[po.status];
                    const isUpdating = updating === po._id;

                    return (
                      <tr
                        key={po._id}
                        className="border-t hover:bg-muted/30 transition-colors"
                      >
                        {/* PO Number */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold">
                              {po.poNumber}
                            </span>
                          </div>
                        </td>

                        {/* Supplier */}
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {po.supplierName}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`
                            inline-flex items-center gap-1.5 px-2.5 py-0.5
                            rounded-full text-xs font-medium
                            ${statusCfg.bg} ${statusCfg.color}
                          `}>
                            {po.status === "shipped"   && <TruckIcon        className="size-3" />}
                            {po.status === "delivered" && <CheckCircleIcon  className="size-3" />}
                            {po.status === "sent"      && <ClockIcon        className="size-3" />}
                            {statusCfg.label}
                          </span>
                        </td>

                        {/* Items */}
                        <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                          {po.itemCount} item{po.itemCount !== 1 ? "s" : ""}
                        </td>

                        {/* Total value */}
                        {canViewFinancials && (
                          <td className="px-4 py-3 text-right font-medium hidden lg:table-cell">
                            {formatCurrency(po.totalValue)}
                          </td>
                        )}

                        {/* Date */}
                        <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                          {formatDate(po.createdAt)}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Status update button */}
                            {nextAction && !isSupplier && (
                              <Button
                                size="sm"
                                variant={nextAction.variant}
                                disabled={isUpdating}
                                onClick={() =>
                                  handleStatusUpdate(po._id, nextAction.status)
                                }
                              >
                                {isUpdating ? (
                                  <RefreshCwIcon className="animate-spin size-3" />
                                ) : (
                                  nextAction.label
                                )}
                              </Button>
                            )}

                            {/* Supplier confirm button */}
                            {isSupplier && po.status === "sent" && (
                              <Button
                                size="sm"
                                disabled={isUpdating}
                                onClick={() =>
                                  handleStatusUpdate(po._id, "confirmed")
                                }
                              >
                                {isUpdating ? (
                                  <RefreshCwIcon className="animate-spin size-3" />
                                ) : (
                                  "Confirm Order"
                                )}
                              </Button>
                            )}

                            {/* View detail */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                router.push(
                                  `/reorders/purchase-orders/${po._id}`
                                )
                              }
                            >
                              <ChevronRightIcon className="size-4" />
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
    </div>
  );
}