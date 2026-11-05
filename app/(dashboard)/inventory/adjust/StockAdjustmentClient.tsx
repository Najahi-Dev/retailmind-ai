"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useRole } from "@/hooks/useRole";
import {
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  History,
  Lock,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";

interface Props {
  initialProductId?: string;
  initialLocationId?: string;
}

const REASON_PRESETS = [
  "Cycle count / audit correction",
  "Damaged / broken",
  "Expired stock",
  "Theft / shrinkage",
  "Found stock",
  "Data entry error",
  "Returned to stock",
] as const;

// A variance this large needs an explicit confirmation before it is applied.
const LARGE_VARIANCE_PCT = 25;
const LARGE_VARIANCE_UNITS = 50;

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ConvexError && typeof err.data === "string") return err.data;
  if (err instanceof Error) return err.message.replace(/^[\s\S]*Uncaught ConvexError:\s*/, "").split("\n")[0];
  return fallback;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(val);

const formatDateTime = (ts: number) =>
  new Date(ts).toLocaleString("en-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function StockAdjustmentClient({ initialProductId = "", initialLocationId = "" }: Props) {
  const router = useRouter();
  const { token } = useAuth();
  const { canApproveReorders: canAdjust, canViewFinancials, isLoading: roleLoading } = useRole();

  const data = useQuery(
    api.inventory.getStockControlFormData,
    canAdjust ? { token: token ?? undefined } : "skip",
  );
  const adjustStock = useMutation(api.inventory.recordStockAdjustment);

  const [pickedProductId, setPickedProductId] = useState(initialProductId);
  const [pickedLocationId, setPickedLocationId] = useState(initialLocationId);
  // null = untouched, i.e. "same as the current system quantity"
  const [countInput, setCountInput] = useState<string | null>(null);
  const [reason, setReason] = useState<string>(REASON_PRESETS[0]);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmLarge, setConfirmLarge] = useState(false);
  const [submitting, setSubmitting] = useState<null | "stay" | "leave">(null);
  const [historyScope, setHistoryScope] = useState<"product" | "all">("product");

  const products = useMemo(() => data?.products ?? [], [data]);
  const locations = useMemo(() => data?.locations ?? [], [data]);
  const inventory = useMemo(() => data?.inventory ?? [], [data]);

  // Fall back to the first item when nothing (or an unknown id) is selected.
  const productId = products.some((p) => p._id === pickedProductId) ? pickedProductId : (products[0]?._id ?? "");
  const locationId = locations.some((l) => l._id === pickedLocationId)
    ? pickedLocationId
    : (locations[0]?._id ?? "");

  const selectedProduct = products.find((p) => p._id === productId);
  const selectedLocation = locations.find((l) => l._id === locationId);
  const currentEntry = inventory.find((e) => e.productId === productId && e.locationId === locationId);

  const history = useQuery(
    api.inventory.getRecentAdjustments,
    canAdjust && token
      ? {
          token,
          productId: historyScope === "product" && productId ? (productId as Id<"products">) : undefined,
          limit: 8,
        }
      : "skip",
  );

  const productOptions = useMemo<SearchableSelectOption[]>(() => {
    const locName = locations.find((l) => l._id === locationId)?.name;
    return products.map((product) => {
      const entry = inventory.find((e) => e.productId === product._id && e.locationId === locationId);
      return {
        value: product._id,
        label: `${product.sku} · ${product.name}`,
        description: locName ? `${entry?.onHand ?? 0} ${product.unit} on hand at ${locName}` : product.unit,
      };
    });
  }, [products, inventory, locations, locationId]);

  const locationOptions = useMemo<SearchableSelectOption[]>(() => {
    const prod = products.find((p) => p._id === productId);
    return locations.map((location) => {
      const entry = inventory.find((e) => e.productId === productId && e.locationId === location._id);
      const type = location.type ? location.type.replace(/_/g, " ") : "location";
      return {
        value: location._id,
        label: location.name,
        description: prod ? `${type} · ${entry?.onHand ?? 0} ${prod.unit} of ${prod.sku}` : type,
        keywords: type,
      };
    });
  }, [locations, inventory, products, productId]);

  // Stock of the selected product across every location
  const productLocations = useMemo(
    () =>
      inventory
        .filter((e) => e.productId === productId)
        .map((e) => ({ ...e, name: locations.find((l) => l._id === e.locationId)?.name ?? "Unknown" }))
        .sort((a, b) => b.onHand - a.onHand),
    [inventory, locations, productId],
  );
  const totalOnHand = productLocations.reduce((sum, e) => sum + e.onHand, 0);

  const currentOnHand = currentEntry?.onHand ?? 0;
  const reserved = currentEntry?.reserved ?? 0;
  const countValue = countInput === null ? currentOnHand : countInput.trim() === "" ? NaN : Number(countInput);
  const countValid = Number.isFinite(countValue) && countValue >= 0;
  const delta = countValid ? countValue - currentOnHand : 0;
  const variancePct = currentOnHand > 0 ? (delta / currentOnHand) * 100 : delta !== 0 ? 100 : 0;
  const costPrice = selectedProduct?.costPrice;
  const valueImpact = costPrice !== undefined ? delta * costPrice : undefined;
  const newTotal = totalOnHand + delta;

  const belowReserved = countValid && countValue < reserved;
  const isLarge = delta !== 0 && (Math.abs(variancePct) >= LARGE_VARIANCE_PCT || Math.abs(delta) >= LARGE_VARIANCE_UNITS);
  const reasonOk = reason.trim().length > 0;

  let blocker: string | null = null;
  if (!selectedProduct || !selectedLocation) blocker = "Choose a product and a location.";
  else if (!countValid) blocker = "Enter a valid counted quantity (0 or more).";
  else if (delta === 0) blocker = "Counted stock matches the system — nothing to adjust.";
  else if (belowReserved) blocker = `Count is below the ${reserved} units reserved for open orders.`;
  else if (!reasonOk) blocker = "Choose or enter a reason.";
  else if (isLarge && !confirmLarge) blocker = "Confirm the large variance below.";

  const stockStatus = (qty: number) => {
    if (!selectedProduct) return null;
    if (qty <= 0) return { label: "Out of stock", cls: "bg-red-600 text-white" };
    if (qty <= selectedProduct.safetyStock) return { label: "Critical", cls: "bg-red-500/15 text-red-600 dark:text-red-400" };
    if (qty <= selectedProduct.reorderPoint) return { label: "Low", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" };
    return { label: "Healthy", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" };
  };
  const statusBefore = stockStatus(totalOnHand);
  const statusAfter = stockStatus(newTotal);

  const resetCount = () => {
    setCountInput(null);
    setConfirmLarge(false);
  };

  const selectProduct = (id: string) => {
    setPickedProductId(id);
    resetCount();
  };
  const selectLocation = (id: string) => {
    setPickedLocationId(id);
    resetCount();
  };

  const nudge = (by: number) => {
    const base = countValid ? countValue : currentOnHand;
    setCountInput(String(Math.max(0, base + by)));
    setConfirmLarge(false);
  };

  const submit = async (mode: "stay" | "leave") => {
    if (blocker || !selectedProduct || !selectedLocation) {
      if (blocker) toast.error(blocker);
      return;
    }
    setSubmitting(mode);
    try {
      const result = await adjustStock({
        token: token ?? undefined,
        productId: selectedProduct._id as Id<"products">,
        locationId: selectedLocation._id as Id<"locations">,
        adjustedOnHand: countValue,
        reason: reason.trim(),
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(
        `${selectedProduct.name} at ${selectedLocation.name}: ${result.previousOnHand} → ${result.newOnHand} (${
          result.delta > 0 ? "+" : ""
        }${result.delta} ${selectedProduct.unit}).`,
      );
      if (mode === "leave") {
        router.push("/inventory");
      } else {
        resetCount();
        setNotes("");
      }
    } catch (error) {
      toast.error(errorMessage(error, "Unable to adjust stock."));
    } finally {
      setSubmitting(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit("leave");
  };

  if (roleLoading || (canAdjust && !data)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-slate-500 font-medium">
        <RefreshCw className="animate-spin w-6 h-6 text-amber-600" />
        <span>Loading Stock Adjustment Engine...</span>
      </div>
    );
  }

  if (!canAdjust) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="max-w-md w-full text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl">
          <CardContent className="pt-8 pb-6 space-y-3">
            <div className="mx-auto size-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <p className="font-bold text-slate-900 dark:text-white">Managers only</p>
            <p className="text-xs text-slate-500">
              Stock adjustments change audited inventory totals, so only managers and administrators can apply them.
              Ask a manager to record the count, or use Stock In / Stock Out for normal movements.
            </p>
            <Button variant="outline" size="sm" onClick={() => router.push("/inventory")} className="rounded-xl text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to inventory
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (products.length === 0 || locations.length === 0) {
    const missingProducts = products.length === 0;
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="max-w-md w-full text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl">
          <CardContent className="pt-8 pb-6 space-y-3">
            <Boxes className="mx-auto w-10 h-10 text-slate-300" />
            <p className="font-bold text-slate-900 dark:text-white">
              {missingProducts ? "No active products yet" : "No active locations yet"}
            </p>
            <p className="text-xs text-slate-500">
              {missingProducts
                ? "Add a product before recording a stock adjustment."
                : "Add a store or warehouse location (from the Add Product form) before recording a stock adjustment."}
            </p>
            <Button
              size="sm"
              onClick={() => router.push("/inventory/add-product")}
              className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {missingProducts ? "Add product" : "Add a location"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const deltaLabel = `${delta > 0 ? "+" : ""}${delta}`;

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full">
      {/* ── HERO BANNER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 text-white p-6 rounded-xl shadow-xl border shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/inventory")}
              className="bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white rounded-xl h-8 px-3 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Inventory
            </Button>
            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs px-3 py-0.5">
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-amber-400" />
              Stock Audit Adjustment
            </Badge>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Manual Stock Adjustment Override
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 sm:max-w-2xl w-[95vw] sm:w-full">
            Reconcile physical stock counts with digital inventory system totals for damaged goods, audit corrections, or shrinkage.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT & CENTER (2 COLS) ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Target */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Target SKU & Location
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Select the item and location you physically counted.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Product SKU <span className="text-red-500">*</span>
                  </Label>
                  <SearchableSelect
                    options={productOptions}
                    value={productId}
                    onValueChange={selectProduct}
                    placeholder="Choose product..."
                    searchPlaceholder="Search by SKU or product name..."
                    emptyText="No products match your search."
                    className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Location <span className="text-red-500">*</span>
                  </Label>
                  <SearchableSelect
                    options={locationOptions}
                    value={locationId}
                    onValueChange={selectLocation}
                    placeholder="Choose location..."
                    searchPlaceholder="Search locations..."
                    emptyText="No locations match your search."
                    className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              {/* Current stock snapshot at this location */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "System on hand", value: currentOnHand, cls: "text-slate-900 dark:text-white" },
                  { label: "Reserved", value: reserved, cls: reserved > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white" },
                  { label: "Available", value: currentEntry?.available ?? 0, cls: "text-slate-900 dark:text-white" },
                  { label: "Reorder point", value: selectedProduct?.reorderPoint ?? 0, cls: "text-slate-900 dark:text-white" },
                ].map((k) => (
                  <div key={k.label} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3">
                    <p className="text-[11px] font-semibold text-slate-500">{k.label}</p>
                    <p className={`text-lg font-extrabold tabular-nums ${k.cls}`}>
                      {k.value} <span className="text-[11px] font-medium text-slate-400">{selectedProduct?.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 -mt-2">
                {currentEntry
                  ? `Last updated ${formatDateTime(currentEntry.lastUpdated)}`
                  : "No stock record at this location yet — the adjustment will create one."}
              </p>
            </CardContent>
          </Card>

          {/* 2. Count & reason */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Physical Count & Reason
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Enter what you actually counted. The system records the difference as an adjustment.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="counted" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Physical counted stock <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" onClick={() => nudge(-1)} aria-label="Decrease by one">
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    id="counted"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={countInput ?? String(currentOnHand)}
                    onChange={(e) => {
                      setCountInput(e.target.value);
                      setConfirmLarge(false);
                    }}
                    aria-invalid={!countValid || belowReserved}
                    className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 rounded-xl border-slate-200 dark:border-slate-800 text-center"
                  />
                  <Button type="button" variant="outline" size="icon" className="rounded-xl shrink-0" onClick={() => nudge(1)} aria-label="Increase by one">
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-xs shrink-0"
                    onClick={resetCount}
                    disabled={countInput === null}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
                  </Button>
                </div>
                {!countValid && <p className="text-[11px] text-red-600">Enter 0 or a positive number.</p>}
                {belowReserved && (
                  <p className="text-[11px] text-red-600">
                    {reserved} units here are reserved for open orders — the count can&apos;t go below that.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Adjustment reason <span className="text-red-500">*</span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {REASON_PRESETS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                        reason === r
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Or type a custom reason"
                  maxLength={120}
                  aria-invalid={!reasonOk}
                  className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Audit sheet / reference code</Label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. AUDIT-2026-Q3-04"
                    maxLength={60}
                    className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
                  />
                  <p className="text-[11px] text-slate-400">Kept after saving, so you can count several items on one sheet.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Internal notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Details about the variance..."
                    maxLength={500}
                    className="text-xs rounded-xl border-slate-200 dark:border-slate-800 resize-none min-h-[72px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Recent adjustments */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Recent Adjustments
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">Audit trail of manual stock corrections.</CardDescription>
                </div>
                <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 text-[11px] font-semibold">
                  {(["product", "all"] as const).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => setHistoryScope(scope)}
                      className={`px-2.5 py-1 rounded-md ${
                        historyScope === scope ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {scope === "product" ? "This product" : "All products"}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {history === undefined ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-6 justify-center">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading history...
                </div>
              ) : history.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No manual adjustments recorded yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.map((h) => (
                    <li key={h._id} className="py-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {historyScope === "all" && (
                            <span className="font-mono text-indigo-600 dark:text-indigo-400 mr-1.5">{h.productSku}</span>
                          )}
                          {h.reason}
                          {h.reference && <span className="ml-1.5 text-slate-400 font-mono">#{h.reference}</span>}
                        </p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 flex-wrap">
                          <MapPin className="w-3 h-3" /> {h.locationName} · {h.userName} · {formatDateTime(h.createdAt)}
                        </p>
                        {h.notes && <p className="text-[11px] text-slate-400 truncate">{h.notes}</p>}
                      </div>
                      <Badge
                        className={`shrink-0 font-extrabold text-[11px] ${
                          h.quantity > 0
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/15 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {h.quantity > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {h.quantity > 0 ? "+" : ""}
                        {h.quantity} {h.unit}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT: SUMMARY PANEL ── */}
        <div className="space-y-6">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm lg:sticky lg:top-24">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Net Variance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-amber-700 dark:text-amber-300 font-medium">Product</span>
                  <span className="font-bold text-slate-900 dark:text-white max-w-[160px] truncate">{selectedProduct?.name || "—"}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-amber-700 dark:text-amber-300 font-medium">Location</span>
                  <span className="font-bold text-slate-900 dark:text-white max-w-[160px] truncate">{selectedLocation?.name || "—"}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-amber-500/20">
                  <span className="text-amber-700 dark:text-amber-300 font-medium">System → Counted</span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums flex items-center gap-1">
                    {currentOnHand} <ArrowRight className="w-3 h-3" /> {countValid ? countValue : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-amber-700 dark:text-amber-300 font-bold">Net stock delta</span>
                  <Badge
                    className={`font-extrabold text-xs px-2.5 py-0.5 ${
                      delta === 0 ? "bg-slate-200 text-slate-800" : delta > 0 ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}
                  >
                    {deltaLabel} {selectedProduct?.unit}
                    {delta !== 0 && currentOnHand > 0 && ` (${variancePct > 0 ? "+" : ""}${variancePct.toFixed(1)}%)`}
                  </Badge>
                </div>
                {canViewFinancials && valueImpact !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-amber-700 dark:text-amber-300 font-medium">Value impact (at cost)</span>
                    <span
                      className={`font-bold tabular-nums ${
                        valueImpact > 0 ? "text-emerald-600" : valueImpact < 0 ? "text-red-600" : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {valueImpact > 0 ? "+" : ""}
                      {formatCurrency(valueImpact)}
                    </span>
                  </div>
                )}
              </div>

              {/* Stock across all locations */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Total across locations</span>
                  <span className="font-bold tabular-nums text-slate-900 dark:text-white flex items-center gap-1">
                    {totalOnHand} <ArrowRight className="w-3 h-3" /> {newTotal}
                  </span>
                </div>
                {statusBefore && statusAfter && (
                  <div className="flex items-center justify-end gap-1.5">
                    <Badge className={`text-[10px] ${statusBefore.cls}`}>{statusBefore.label}</Badge>
                    {statusAfter.label !== statusBefore.label && (
                      <>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <Badge className={`text-[10px] ${statusAfter.cls}`}>{statusAfter.label}</Badge>
                      </>
                    )}
                  </div>
                )}
                {productLocations.length > 1 && (
                  <ul className="space-y-1 pt-1">
                    {productLocations.map((e) => (
                      <li
                        key={e._id}
                        className={`flex justify-between ${e.locationId === locationId ? "font-bold text-slate-900 dark:text-white" : "text-slate-500"}`}
                      >
                        <span className="truncate">{e.name}</span>
                        <span className="tabular-nums">{e.onHand}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {statusAfter && statusBefore && statusAfter.label !== statusBefore.label && delta < 0 && newTotal <= (selectedProduct?.reorderPoint ?? 0) && (
                <div className="flex gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>This drops total stock to or below the reorder point ({selectedProduct?.reorderPoint}). It will be picked up by the next reorder scan.</span>
                </div>
              )}

              {isLarge && !belowReserved && countValid && (
                <label className="flex gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmLarge}
                    onChange={(e) => setConfirmLarge(e.target.checked)}
                    className="mt-0.5 accent-red-600"
                  />
                  <span>
                    Large variance ({deltaLabel} {selectedProduct?.unit}). I re-counted and confirm this figure is correct.
                  </span>
                </label>
              )}

              {blocker && delta !== 0 && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {blocker}
                </p>
              )}
            </CardContent>
            <CardFooter className="pt-2 flex flex-col gap-2">
              <Button
                type="submit"
                disabled={!!submitting || !!blocker}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-lg h-11 shadow-md border-0"
              >
                {submitting === "leave" ? (
                  <>
                    <RefreshCw className="animate-spin w-4 h-4 mr-2" /> Applying Adjustment...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Apply Adjustment ({deltaLabel})
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!!submitting || !!blocker}
                onClick={() => void submit("stay")}
                className="w-full rounded-lg h-10 text-xs font-semibold"
              >
                {submitting === "stay" ? (
                  <RefreshCw className="animate-spin w-3.5 h-3.5 mr-1.5" />
                ) : (
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                )}
                Apply & adjust another
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
