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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [saveOpen,     setSaveOpen]     = useState(false);

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
      <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5">
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
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5">
      {/* ── 1. HERO PRODUCT HEADER BANNER ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Product Info & Status */}
          <div className="flex items-start gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0 size-10 rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeftIcon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </Button>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {product.name}
                </h1>
                <Badge className={`text-xs font-semibold px-2.5 py-0.5 border ${STATUS_CONFIG[status].variant === "destructive" ? "bg-red-500/10 text-red-600 border-red-500/20" : STATUS_CONFIG[status].variant === "secondary" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"}`}>
                  {STATUS_CONFIG[status].icon}
                  <span className="ml-1">{STATUS_CONFIG[status].label}</span>
                </Badge>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md">
                  SKU: {product.sku}
                </span>
                <span>•</span>
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300 font-semibold">
                  {category?.name ?? "Uncategorized"}
                </span>
                <span>•</span>
                <span>Location: <strong className="text-slate-900 dark:text-white">{location?.name ?? "Colombo Main Warehouse"}</strong></span>
                {supplier && (
                  <>
                    <span>•</span>
                    <span>Supplier: <strong className="text-slate-900 dark:text-white">{supplier.name}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Operations Button Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/inventory/add")}
              className="h-9 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 px-3"
            >
              <PackageIcon className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Stock In
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/inventory/adjust")}
              className="h-9 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 px-3"
            >
              <TrendingDownIcon className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Adjust Qty
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/inventory/transfer")}
              className="h-9 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 px-3"
            >
              <RefreshCwIcon className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> Transfer
            </Button>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => router.push(`/inventory/${productId}/edit`)}
                className="h-9 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 border-0"
              >
                Edit SKU
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. TOP KPI METRICS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">On Hand Inventory</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
              {inventory?.onHand ?? 0}
            </p>
            <span className="text-xs font-semibold text-slate-500">{product.unit}</span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">Physical Stock in Store</p>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Available to Fulfill</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
              {inventory?.available ?? 0}
            </p>
            <span className="text-xs font-semibold text-slate-500">{product.unit}</span>
          </div>
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">Unreserved Net Inventory</p>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Reorder Threshold</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <p className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {product.reorderPoint}
            </p>
            <span className="text-xs font-semibold text-slate-500">{product.unit}</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Safety: {product.safetyStock} {product.unit}</p>
        </Card>

        {canViewFinancials ? (
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Stock Value</p>
            <div className="mt-1">
              <p className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums truncate">
                {formatCurrency((inventory?.onHand ?? 0) * product.costPrice)}
              </p>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              {Math.round(((product.sellingPrice - product.costPrice) / (product.sellingPrice || 1)) * 100)}% Gross Margin
            </p>
          </Card>
        ) : (
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Safety Buffer Qty</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
                {product.safetyStock}
              </p>
              <span className="text-xs font-semibold text-slate-500">{product.unit}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Minimum Emergency Stock</p>
          </Card>
        )}
      </div>

      {/* ── 3. EXECUTIVE TABS SYSTEM ── */}
      <Tabs defaultValue="overview" className="flex flex-col gap-4">
        <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-lg">
          <TabsTrigger value="overview" className="rounded-xl text-xs font-bold px-4 py-2">Overview & Health</TabsTrigger>
          <TabsTrigger value="stock-history" className="rounded-xl text-xs font-bold px-4 py-2">Stock Movement History</TabsTrigger>
          <TabsTrigger value="forecasts" className="rounded-xl text-xs font-bold px-4 py-2">
            Demand Forecasts
            {(!forecasts || forecasts.length === 0) && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 bg-indigo-500/10 text-indigo-600">
                Phase 3
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="purchase-orders" className="rounded-xl text-xs font-bold px-4 py-2">
            Purchase Orders
            {orders && orders.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 bg-indigo-600 text-white">
                {orders.length}
              </Badge>
            )}
          </TabsTrigger>
          {canEdit && <TabsTrigger value="settings" className="rounded-xl text-xs font-bold px-4 py-2">Configuration & Limits</TabsTrigger>}
        </TabsList>

        {/* ══ Tab 1 — Overview & Stock Health ══════════════════ */}
        <TabsContent value="overview" className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Product Info Card */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PackageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Product Identity & Specification
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {[
                  { label: "SKU Code", value: product.sku },
                  { label: "Product Name", value: product.name },
                  {
                    label: "Category",
                    value: category?.name ?? "Uncategorized",
                  },
                  { label: "Unit of Measure", value: product.unit },
                  {
                    label: "Primary Vendor / Supplier",
                    value: supplier?.name ?? "Not assigned",
                  },
                  { label: "Primary Store Location", value: location?.name ?? "Unknown" },
                  {
                    label: "Batch & Expiry Tracking",
                    value: product.trackBatches ? "Enabled (Lot Number Recorded)" : "Disabled",
                  },
                  {
                    label: "Description",
                    value: product.description ?? "No description available.",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                  >
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 w-36">
                      {row.label}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white text-right">
                      {row.value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Stock Info & Financials Column */}
            <div className="flex flex-col gap-4">
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUpIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Real-Time Stock Thresholds & Capacity Gauge
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {[
                    {
                      label: "On Hand Physical",
                      value: `${inventory?.onHand ?? 0} ${product.unit}`,
                    },
                    {
                      label: "Reserved Inventory",
                      value: `${inventory?.reserved ?? 0} ${product.unit}`,
                    },
                    {
                      label: "Net Available",
                      value: `${inventory?.available ?? 0} ${product.unit}`,
                    },
                    {
                      label: "Reorder Trigger Level",
                      value: `${product.reorderPoint} ${product.unit}`,
                    },
                    {
                      label: "Safety Stock Buffer",
                      value: `${product.safetyStock} ${product.unit}`,
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                    >
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {row.label}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{row.value}</span>
                    </div>
                  ))}

                  {/* Stock gauge */}
                  <div className="pt-3 space-y-1.5">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span>Safety: {product.safetyStock}</span>
                      <span className="font-bold text-slate-900 dark:text-white">On Hand: {inventory?.onHand ?? 0}</span>
                      <span>Target: {product.reorderPoint * 2}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all ${
                          status === "critical"
                            ? "bg-red-500"
                            : status === "low"
                              ? "bg-amber-500"
                              : status === "overstock"
                                ? "bg-blue-500"
                                : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(0, Math.round(((inventory?.onHand ?? 0) / (product.reorderPoint * 2 || 1)) * 100)))}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial info — admin/manager only */}
              {canViewFinancials && (
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <ShoppingCartIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Financial Valuation & Margin Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {[
                      {
                        label: "Cost Basis (Unit)",
                        value: formatCurrency(product.costPrice),
                      },
                      {
                        label: "Retail Selling Price",
                        value: formatCurrency(product.sellingPrice),
                      },
                      {
                        label: "Gross Profit Margin",
                        value: `${Math.round(((product.sellingPrice - product.costPrice) / (product.sellingPrice || 1)) * 100)}%`,
                      },
                      {
                        label: "Total Holding Stock Value",
                        value: formatCurrency(
                          (inventory?.onHand ?? 0) * product.costPrice,
                        ),
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0"
                      >
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {row.label}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{row.value}</span>
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
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCwIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Audit Stock Movement Log
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Displaying last {history?.length ?? 0} physical inventory transactions and transfers
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {!history ? (
                <div className="flex items-center gap-2 text-slate-500 py-12 justify-center text-xs font-semibold">
                  <RefreshCwIcon className="animate-spin size-4 text-indigo-500" />
                  Fetching audit log records...
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <PackageIcon className="size-10 mx-auto mb-2 opacity-40 text-indigo-500" />
                  <p className="font-bold text-slate-900 dark:text-white text-sm">No Movement Records Found</p>
                  <p className="text-xs text-slate-500">No stock entries, transfers, or write-offs recorded for this SKU.</p>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100/90 dark:bg-slate-800/90 h-10">
                      <tr>
                        <th className="text-left px-4 py-2 font-bold text-slate-700 dark:text-slate-300">Timestamp</th>
                        <th className="text-left px-4 py-2 font-bold text-slate-700 dark:text-slate-300">Action Type</th>
                        <th className="text-left px-4 py-2 font-bold text-slate-700 dark:text-slate-300 hidden sm:table-cell">Reason / Notes</th>
                        <th className="text-right px-4 py-2 font-bold text-slate-700 dark:text-slate-300">Quantity Delta</th>
                        <th className="text-left px-4 py-2 font-bold text-slate-700 dark:text-slate-300 hidden md:table-cell">Audit Ref</th>
                        <th className="text-left px-4 py-2 font-bold text-slate-700 dark:text-slate-300 hidden lg:table-cell">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((m) => {
                        const config = MOVEMENT_CONFIG[m.type] ?? {
                          color: "text-slate-900 dark:text-white",
                          sign: "",
                        };
                        return (
                          <tr
                            key={m._id}
                            className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 h-11 transition-colors"
                          >
                            <td className="px-4 py-2 text-slate-500 dark:text-slate-400 text-xs">
                              {formatDateTime(m.createdAt)}
                            </td>
                            <td className="px-4 py-2">
                              <Badge
                                variant="outline"
                                className="text-xs font-semibold capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                              >
                                {m.type.replace("_", " ")}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-slate-600 dark:text-slate-300 hidden sm:table-cell font-medium">
                              {m.reason ?? "—"}
                            </td>
                            <td
                              className={`px-4 py-2 text-right font-mono font-bold text-sm ${config.color}`}
                            >
                              {config.sign}
                              {Math.abs(m.quantity)}
                            </td>
                            <td className="px-4 py-2 text-slate-500 dark:text-slate-400 font-mono text-xs hidden md:table-cell">
                              {m.reference ?? "—"}
                            </td>
                            <td className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hidden lg:table-cell">
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
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUpIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                AI Neural Demand Predictions
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Machine learning forecast trajectory & velocity predictions
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {!forecasts || forecasts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="size-14 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <TrendingUpIcon className="size-7 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <p className="font-bold text-slate-900 dark:text-white text-base">AI Demand Engine Active</p>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    Neural forecasting runs continuously across stock sales data to generate predictive reorder triggers.
                  </p>
                  <Badge variant="outline" className="mt-2 text-xs font-bold border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5">
                    Phase 3 Live Service
                  </Badge>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100/90 dark:bg-slate-800/90 h-10">
                      <tr>
                        <th className="text-left px-4 py-2 font-bold text-slate-700 dark:text-slate-300">Target Date</th>
                        <th className="text-right px-4 py-2 font-bold text-slate-700 dark:text-slate-300">Predicted Demand</th>
                        <th className="text-right px-4 py-2 font-bold text-slate-700 dark:text-slate-300 hidden sm:table-cell">Lower Bound</th>
                        <th className="text-right px-4 py-2 font-bold text-slate-700 dark:text-slate-300 hidden sm:table-cell">Upper Bound</th>
                        <th className="text-right px-4 py-2 font-bold text-slate-700 dark:text-slate-300 hidden md:table-cell">AI Confidence</th>
                        <th className="text-left px-4 py-2 font-bold text-slate-700 dark:text-slate-300 hidden lg:table-cell">Model Architecture</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecasts.map((f) => (
                        <tr key={f._id} className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 h-11 transition-colors">
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium">
                            {formatDate(f.forecastDate)}
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                            {f.predictedDemand.toFixed(1)} {product.unit}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-500 hidden sm:table-cell">
                            {f.lowerBound.toFixed(1)}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-500 hidden sm:table-cell">
                            {f.upperBound.toFixed(1)}
                          </td>
                          <td className="px-4 py-2 text-right hidden md:table-cell">
                            <Badge variant="outline" className="text-xs font-bold border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5">
                              {(f.confidenceScore * 100).toFixed(0)}%
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-slate-500 text-xs hidden lg:table-cell capitalize font-mono">
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
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCartIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Linked Vendor Purchase Orders
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {orders?.length ?? 0} active purchase orders contain line items for this product
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {!orders ? (
                <div className="flex items-center gap-2 text-slate-500 py-12 justify-center text-xs font-semibold">
                  <RefreshCwIcon className="animate-spin size-4 text-indigo-500" />
                  Loading related purchase orders...
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <ShoppingCartIcon className="size-10 mx-auto mb-2 opacity-40 text-indigo-500" />
                  <p className="font-bold text-slate-900 dark:text-white text-sm">No Purchase Orders Found</p>
                  <p className="text-xs text-slate-500">No active POs have been issued for this product SKU yet.</p>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100/90 dark:bg-slate-800/90 h-10">
                      <tr>
                        <th className="text-left px-4 py-2 font-bold text-slate-700 dark:text-slate-300">PO Code</th>
                        <th className="text-left px-4 py-2 font-bold text-slate-700 dark:text-slate-300 hidden sm:table-cell">Supplier / Vendor</th>
                        <th className="text-left px-4 py-2 font-bold text-slate-700 dark:text-slate-300">Status</th>
                        <th className="text-right px-4 py-2 font-bold text-slate-700 dark:text-slate-300">Order Qty</th>
                        {canViewFinancials && (
                          <th className="text-right px-4 py-2 font-bold text-slate-700 dark:text-slate-300 hidden md:table-cell">
                            Total Line Value
                          </th>
                        )}
                        <th className="text-left px-4 py-2 font-bold text-slate-700 dark:text-slate-300 hidden lg:table-cell">
                          Created Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((po) => (
                        <tr
                          key={po._id}
                          className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer h-11 transition-colors"
                        >
                          <td className="px-4 py-2 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {po.poNumber}
                          </td>
                          <td className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium hidden sm:table-cell">
                            {po.supplierName}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${PO_STATUS_CONFIG[po.status]}`}
                            >
                              {po.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-slate-900 dark:text-white">
                            {po.lineQty} {product.unit}
                          </td>
                          {canViewFinancials && (
                            <td className="px-4 py-2 text-right font-bold text-slate-900 dark:text-white hidden md:table-cell tabular-nums">
                              {formatCurrency(po.lineQty * po.lineUnitCost)}
                            </td>
                          )}
                          <td className="px-4 py-2 text-slate-500 text-xs hidden lg:table-cell">
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

        {/* ══ Tab 5 — Configuration & Limits (admin/manager) ══ */}
        {canEdit && (
          <TabsContent value="settings">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Reorder settings */}
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingDownIcon className="w-4 h-4 text-amber-500" />
                    Inventory Threshold & Reorder Rules
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Configure automated alert triggers and minimum safety inventory limits
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Reorder Point ({product.unit})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={reorderPoint}
                      onChange={(e) => setReorderPoint(Number(e.target.value))}
                      className="flex h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-1 text-xs font-bold shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                    />
                    <p className="text-[11px] text-slate-500">
                      System generates automated replenishment suggestions when stock falls below this level.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Safety Stock Buffer ({product.unit})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={safetyStock}
                      onChange={(e) => setSafetyStock(Number(e.target.value))}
                      className="flex h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-1 text-xs font-bold shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                    />
                    <p className="text-[11px] text-slate-500">
                      Critical stock alert fires immediately when inventory falls below this minimum buffer.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Product settings */}
              <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShoppingCartIcon className="w-4 h-4 text-emerald-500" />
                    Pricing Strategy & Tracking Status
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Adjust cost basis and retail selling price for live profit margin recalculation
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {canViewFinancials && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Cost Basis (LKR)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={costPrice}
                          onChange={(e) => setCostPrice(Number(e.target.value))}
                          className="flex h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-1 text-xs font-bold shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Retail Selling Price (LKR)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={sellingPrice}
                          onChange={(e) =>
                            setSellingPrice(Number(e.target.value))
                          }
                          className="flex h-9 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-1 text-xs font-bold shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-2 border border-slate-200 dark:border-slate-800 rounded-xl px-3 bg-slate-50 dark:bg-slate-800/40">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Batch & Lot Tracking
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Record lot numbers and expiration dates on stock inward
                      </p>
                    </div>
                    <Badge
                      className={product.trackBatches ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-bold" : "bg-slate-200 text-slate-600 text-xs"}
                    >
                      {product.trackBatches ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between py-2 border border-slate-200 dark:border-slate-800 rounded-xl px-3 bg-slate-50 dark:bg-slate-800/40">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Active System Status</p>
                      <p className="text-[11px] text-slate-500">
                        Product visibility across stock catalog & POS channels
                      </p>
                    </div>
                    <Badge className={product.isActive ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs font-bold" : "bg-slate-200 text-slate-600 text-xs"}>
                      {product.isActive ? "Active SKU" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Save button — full width */}
              <div className="lg:col-span-2 pt-2">
                <Button
                  className="w-full h-10 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 border-0 shadow-md transition-all"
                  type="button"
                  onClick={() => setSaveOpen(true)}
                  disabled={saving || saved}
                >
                  {saving
                    ? "Saving Configurations..."
                    : saved
                      ? "✓ Saved Configurations Successfully!"
                      : "Save Threshold & Pricing Changes"}
                </Button>

                {saved && (
                  <p className="text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                    Product threshold and pricing configuration saved successfully.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <AlertDialog open={saveOpen} onOpenChange={setSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save product settings?</AlertDialogTitle>
            <AlertDialogDescription>
              This updates reorder, stock, and pricing settings for this product.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave} disabled={saving || saved}>
              {saving ? "Saving..." : "Save Changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}