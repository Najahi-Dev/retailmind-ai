"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge }  from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeftIcon,
  PackageIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  AlertTriangleIcon,
  ShoppingCartIcon,
} from "lucide-react";

interface Props {
  productId: string;
  role:      string;
}

const STATUS_CONFIG = {
  critical:  { label: "Critical",  variant: "destructive" as const, icon: <AlertTriangleIcon className="size-3" /> },
  low:       { label: "Low Stock", variant: "secondary"   as const, icon: <TrendingDownIcon  className="size-3" /> },
  healthy:   { label: "Healthy",   variant: "outline"     as const, icon: <TrendingUpIcon    className="size-3" /> },
  overstock: { label: "Overstock", variant: "secondary"   as const, icon: <PackageIcon       className="size-3" /> },
};

const PO_STATUS_CONFIG: Record<string, string> = {
  draft:     "bg-muted text-muted-foreground",
  sent:      "bg-blue-500/10 text-blue-500",
  confirmed: "bg-yellow-500/10 text-yellow-500",
  shipped:   "bg-purple-500/10 text-purple-500",
  delivered: "bg-green-500/10 text-green-500",
  cancelled: "bg-destructive/10 text-destructive",
};

const MOVEMENT_CONFIG: Record<string, { color: string; sign: string }> = {
  stock_in:     { color: "text-green-500",      sign: "+" },
  stock_out:    { color: "text-destructive",     sign: "-" },
  adjustment:   { color: "text-yellow-500",      sign: "±" },
  transfer_in:  { color: "text-blue-500",        sign: "+" },
  transfer_out: { color: "text-orange-500",      sign: "-" },
  write_off:    { color: "text-muted-foreground", sign: "-" },
};

export default function ProductDetailClient({ productId, role }: Props) {
  const router = useRouter();
  const updateProduct = useMutation(api.inventory.updateProduct);
  const detail   = useQuery(api.inventory.getProductDetail,   { productId: productId as Id<"products"> });
  const history  = useQuery(api.inventory.getStockHistory,    { productId: productId as Id<"products"> });
  const orders   = useQuery(api.inventory.getProductPurchaseOrders, { productId: productId as Id<"products"> });
  const forecasts = useQuery(api.inventory.getProductForecasts, { productId: productId as Id<"products"> });
  const [reorderPoint, setReorderPoint] = useState(0);
  const [safetyStock,  setSafetyStock]  = useState(0);
  const [costPrice,    setCostPrice]    = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);

  const canViewFinancials = ["admin", "manager"].includes(role);
  const canEdit           = ["admin", "manager"].includes(role);

  useEffect(() => {
    if (!detail?.product) return;

    setReorderPoint(detail.product.reorderPoint);
    setSafetyStock(detail.product.safetyStock);
    setCostPrice(detail.product.costPrice);
    setSellingPrice(detail.product.sellingPrice);
  }, [detail?.product]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProduct({
        productId: productId as Id<"products">,
        reorderPoint: Number(reorderPoint),
        safetyStock: Number(safetyStock),
        ...(canViewFinancials
          ? {
              costPrice: Number(costPrice),
              sellingPrice: Number(sellingPrice),
            }
          : {}),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-LK", {
      style:                 "currency",
      currency:              "LKR",
      maximumFractionDigits: 0,
    }).format(val);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", {
      day:   "numeric",
      month: "short",
      year:  "numeric",
    });

  const formatDateTime = (ts: number) =>
    new Date(ts).toLocaleString("en-US", {
      day:    "numeric",
      month:  "short",
      hour:   "2-digit",
      minute: "2-digit",
    });

  // ── Loading ───────────────────────────────────
  if (!detail) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCwIcon className="animate-spin size-4" />
          Loading product...
        </div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────
  if (!detail.product) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <PackageIcon className="size-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">Product not found</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const { product, category, supplier, inventory, location, status } = detail;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 @container/main">
      {/* ── Back + Header ─────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold font-[Montserrat] tracking-tight">
                {product.name}
              </h2>
              <Badge variant={STATUS_CONFIG[status].variant}>
                {STATUS_CONFIG[status].icon}
                {STATUS_CONFIG[status].label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {product.sku} · {category?.name ?? "Uncategorized"}
            </p>
          </div>
        </div>

        {canEdit && (
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => router.push(`/inventory/${productId}/edit`)}
          >
            Edit Product
          </Button>
        )}
      </div>

      {/* ── Quick Stats ───────────────────────── */}
      <div
        className="grid grid-cols-2 gap-3 @xl/main:grid-cols-4
        *:data-[slot=card]:bg-linear-to-t
        *:data-[slot=card]:from-primary/5
        *:data-[slot=card]:to-card
        *:data-[slot=card]:shadow-xs
        dark:*:data-[slot=card]:bg-card"
      >
        <Card className="@container/card">
          <CardHeader className="pb-2">
            <CardDescription>On Hand</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {inventory?.onHand ?? 0}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {product.unit}
              </span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="@container/card">
          <CardHeader className="pb-2">
            <CardDescription>Available</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {inventory?.available ?? 0}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {product.unit}
              </span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="@container/card">
          <CardHeader className="pb-2">
            <CardDescription>Reorder Point</CardDescription>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {product.reorderPoint}
            </CardTitle>
          </CardHeader>
        </Card>

        {canViewFinancials ? (
          <Card className="@container/card">
            <CardHeader className="pb-2">
              <CardDescription>Stock Value</CardDescription>
              <CardTitle className="text-lg font-bold tabular-nums">
                {formatCurrency((inventory?.onHand ?? 0) * product.costPrice)}
              </CardTitle>
            </CardHeader>
          </Card>
        ) : (
          <Card className="@container/card">
            <CardHeader className="pb-2">
              <CardDescription>Safety Stock</CardDescription>
              <CardTitle className="text-2xl font-bold tabular-nums">
                {product.safetyStock}
              </CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>

      {/* ── 5 Tabs ────────────────────────────── */}
      <Tabs defaultValue="overview" className="flex flex-col gap-4">
        <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stock-history">Stock History</TabsTrigger>
          <TabsTrigger value="forecasts">
            Forecasts
            {(!forecasts || forecasts.length === 0) && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                Phase 3
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="purchase-orders">
            Purchase Orders
            {orders && orders.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                {orders.length}
              </Badge>
            )}
          </TabsTrigger>
          {canEdit && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        {/* ══ Tab 1 — Overview ══════════════════ */}
        <TabsContent value="overview" className="flex flex-col gap-4">
          <div className="grid gap-4 @xl/main:grid-cols-2">
            {/* Product Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Product Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "SKU", value: product.sku },
                  { label: "Name", value: product.name },
                  {
                    label: "Category",
                    value: category?.name ?? "Uncategorized",
                  },
                  { label: "Unit", value: product.unit },
                  {
                    label: "Supplier",
                    value: supplier?.name ?? "Not assigned",
                  },
                  { label: "Location", value: location?.name ?? "Unknown" },
                  {
                    label: "Description",
                    value: product.description ?? "No description",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between gap-4 py-1 border-b border-border/50 last:border-0"
                  >
                    <span className="text-sm text-muted-foreground shrink-0 w-28">
                      {row.label}
                    </span>
                    <span className="text-sm font-medium text-right">
                      {row.value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Stock Info */}
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Stock Levels</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    {
                      label: "On Hand",
                      value: `${inventory?.onHand ?? 0} ${product.unit}`,
                    },
                    {
                      label: "Reserved",
                      value: `${inventory?.reserved ?? 0} ${product.unit}`,
                    },
                    {
                      label: "Available",
                      value: `${inventory?.available ?? 0} ${product.unit}`,
                    },
                    {
                      label: "Reorder Point",
                      value: `${product.reorderPoint} ${product.unit}`,
                    },
                    {
                      label: "Safety Stock",
                      value: `${product.safetyStock} ${product.unit}`,
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between py-1 border-b border-border/50 last:border-0"
                    >
                      <span className="text-sm text-muted-foreground">
                        {row.label}
                      </span>
                      <span className="text-sm font-medium">{row.value}</span>
                    </div>
                  ))}

                  {/* Stock gauge */}
                  <div className="pt-2 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Safety: {product.safetyStock}</span>
                      <span>On Hand: {inventory?.onHand ?? 0}</span>
                      <span>Max: {product.reorderPoint * 5}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          status === "critical"
                            ? "bg-destructive"
                            : status === "low"
                              ? "bg-yellow-500"
                              : status === "overstock"
                                ? "bg-blue-500"
                                : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min(100, ((inventory?.onHand ?? 0) / (product.reorderPoint * 5)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial info — admin/manager only */}
              {canViewFinancials && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Financial Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      {
                        label: "Cost Price",
                        value: formatCurrency(product.costPrice),
                      },
                      {
                        label: "Selling Price",
                        value: formatCurrency(product.sellingPrice),
                      },
                      {
                        label: "Margin",
                        value: `${Math.round(((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100)}%`,
                      },
                      {
                        label: "Stock Value",
                        value: formatCurrency(
                          (inventory?.onHand ?? 0) * product.costPrice,
                        ),
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between py-1 border-b border-border/50 last:border-0"
                      >
                        <span className="text-sm text-muted-foreground">
                          {row.label}
                        </span>
                        <span className="text-sm font-medium">{row.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ══ Tab 2 — Stock History ══════════════ */}
        <TabsContent value="stock-history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Stock Movement History
              </CardTitle>
              <CardDescription>
                Last {history?.length ?? 0} movements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!history ? (
                <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                  <RefreshCwIcon className="animate-spin size-4" />
                  Loading history...
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <PackageIcon className="size-8 mx-auto mb-2 opacity-50" />
                  <p>No stock movements yet</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                          Date
                        </th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                          Type
                        </th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden sm:table-cell">
                          Reason
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Qty
                        </th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden md:table-cell">
                          Reference
                        </th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden lg:table-cell">
                          Location
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((m, i) => {
                        const config = MOVEMENT_CONFIG[m.type] ?? {
                          color: "text-foreground",
                          sign: "",
                        };
                        return (
                          <tr
                            key={m._id}
                            className="border-t hover:bg-muted/50"
                          >
                            <td className="px-4 py-2.5 text-muted-foreground text-xs">
                              {formatDateTime(m.createdAt)}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge
                                variant="outline"
                                className="text-xs capitalize"
                              >
                                {m.type.replace("_", " ")}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                              {m.reason ?? "—"}
                            </td>
                            <td
                              className={`px-4 py-2.5 text-right font-mono font-medium ${config.color}`}
                            >
                              {config.sign}
                              {Math.abs(m.quantity)}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground text-xs hidden md:table-cell">
                              {m.reference ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground hidden lg:table-cell">
                              {m.locationName ?? "—"}
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
        </TabsContent>

        {/* ══ Tab 3 — Forecasts ═════════════════ */}
        <TabsContent value="forecasts">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Demand Forecasts</CardTitle>
              <CardDescription>AI-generated demand predictions</CardDescription>
            </CardHeader>
            <CardContent>
              {!forecasts || forecasts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                    <TrendingUpIcon className="size-8 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium">No Forecasts Available</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    AI forecasting will be available in Phase 3 (September
                    2025). The Python FastAPI service will generate demand
                    predictions automatically.
                  </p>
                  <Badge variant="outline" className="mt-2">
                    Coming in Phase 3
                  </Badge>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                          Date
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Predicted
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground hidden sm:table-cell">
                          Lower
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground hidden sm:table-cell">
                          Upper
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground hidden md:table-cell">
                          Confidence
                        </th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden lg:table-cell">
                          Model
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecasts.map((f) => (
                        <tr key={f._id} className="border-t hover:bg-muted/50">
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">
                            {formatDate(f.forecastDate)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium">
                            {f.predictedDemand.toFixed(1)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground hidden sm:table-cell">
                            {f.lowerBound.toFixed(1)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground hidden sm:table-cell">
                            {f.upperBound.toFixed(1)}
                          </td>
                          <td className="px-4 py-2.5 text-right hidden md:table-cell">
                            <Badge variant="outline" className="text-xs">
                              {(f.confidenceScore * 100).toFixed(0)}%
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs hidden lg:table-cell capitalize">
                            {f.modelUsed}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ Tab 4 — Purchase Orders ═══════════ */}
        <TabsContent value="purchase-orders">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Related Purchase Orders
              </CardTitle>
              <CardDescription>
                {orders?.length ?? 0} orders contain this product
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!orders ? (
                <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                  <RefreshCwIcon className="animate-spin size-4" />
                  Loading orders...
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCartIcon className="size-8 mx-auto mb-2 opacity-50" />
                  <p>No purchase orders found</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                          PO Number
                        </th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden sm:table-cell">
                          Supplier
                        </th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Qty
                        </th>
                        {canViewFinancials && (
                          <th className="text-right px-4 py-2 font-medium text-muted-foreground hidden md:table-cell">
                            Line Value
                          </th>
                        )}
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden lg:table-cell">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((po) => (
                        <tr
                          key={po._id}
                          className="border-t hover:bg-muted/50 cursor-pointer"
                        >
                          <td className="px-4 py-2.5 font-mono text-xs font-medium">
                            {po.poNumber}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                            {po.supplierName}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PO_STATUS_CONFIG[po.status]}`}
                            >
                              {po.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium">
                            {po.lineQty}
                          </td>
                          {canViewFinancials && (
                            <td className="px-4 py-2.5 text-right hidden md:table-cell">
                              {formatCurrency(po.lineQty * po.lineUnitCost)}
                            </td>
                          )}
                          <td className="px-4 py-2.5 text-muted-foreground text-xs hidden lg:table-cell">
                            {formatDate(po.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ Tab 5 — Settings (admin/manager) ══ */}
        {canEdit && (
          <TabsContent value="settings">
            <div className="grid gap-4 @xl/main:grid-cols-2">
              {/* Reorder settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Reorder Settings</CardTitle>
                  <CardDescription>
                    Configure stock thresholds for this product
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      Reorder Point ({product.unit})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={reorderPoint}
                      onChange={(e) => setReorderPoint(Number(e.target.value))}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground">
                      System triggers a reorder suggestion when stock falls
                      below this
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      Safety Stock ({product.unit})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={safetyStock}
                      onChange={(e) => setSafetyStock(Number(e.target.value))}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground">
                      Critical alert fires when stock falls below this minimum
                      buffer
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Product settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Product Settings</CardTitle>
                  <CardDescription>
                    Pricing and configuration options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {canViewFinancials && (
                    <>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Cost Price (LKR)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={costPrice}
                          onChange={(e) => setCostPrice(Number(e.target.value))}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Selling Price (LKR)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={sellingPrice}
                          onChange={(e) =>
                            setSellingPrice(Number(e.target.value))
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between py-2 border rounded-md px-3">
                    <div>
                      <p className="text-sm font-medium">
                        Track Batches / Lots
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Enable lot number and expiry date recording
                      </p>
                    </div>
                    <Badge
                      variant={product.trackBatches ? "default" : "secondary"}
                    >
                      {product.trackBatches ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between py-2 border rounded-md px-3">
                    <div>
                      <p className="text-sm font-medium">Active Status</p>
                      <p className="text-xs text-muted-foreground">
                        Product visibility across the system
                      </p>
                    </div>
                    <Badge variant={product.isActive ? "default" : "secondary"}>
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Save button — full width */}
              <div className="@xl/main:col-span-2">
                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={saving || saved}
                >
                  {saving
                    ? "Saving..."
                    : saved
                      ? "✓ Saved successfully!"
                      : "Save Changes"}
                </Button>

                {saved && (
                  <p className="text-center text-sm text-green-500 mt-2">
                    Product settings updated successfully.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}