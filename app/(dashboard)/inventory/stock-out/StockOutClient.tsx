// app/(dashboard)/inventory/stock-out/StockOutClient.tsx
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
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeftIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  PackageIcon,
  CheckCircleIcon,
  MinusCircleIcon,
  ChevronDownIcon,
} from "lucide-react";

interface Props {
  role: string;
}

const REASONS = [
  "Sale",
  "Damage",
  "Expired",
  "Sample",
  "Write-Off",
  "Transfer",
  "Return to Supplier",
  "Other",
];

export default function StockOutClient({ role }: Props) {
  const router = useRouter();
  const formData = useQuery(api.inventory.getStockOutFormData);
  const recordStockOut = useMutation(api.inventory.recordStockOut);

  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("Sale");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const selectedProduct = formData?.products.find((p) => p._id === productId);
  const qtyNum = Number(quantity);
  const isOverStock = selectedProduct
    ? qtyNum > selectedProduct.available
    : false;
  const isValidQty = qtyNum > 0 && !isOverStock;
  const canSubmit =
    productId && locationId && quantity && isValidQty && !submitting;

  const remaining = selectedProduct ? selectedProduct.available - qtyNum : 0;
  const isLowAfter =
    selectedProduct &&
    isValidQty &&
    remaining < selectedProduct.available * 0.3;

  const stockColor = !selectedProduct
    ? ""
    : selectedProduct.available <= 0
      ? "text-destructive"
      : selectedProduct.available <= 20
        ? "text-yellow-500"
        : "text-green-500";

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await recordStockOut({
        productId: productId as Id<"products">,
        locationId: locationId as Id<"locations">,
        quantity: qtyNum,
        reason,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setProductId("");
        setLocationId("");
        setQuantity("");
        setReason("Sale");
        setReference("");
        setNotes("");
      }, 2500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to record stock-out.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!formData) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-6 text-muted-foreground">
        <RefreshCwIcon className="animate-spin size-4" />
        Loading form data...
      </div>
    );
  }

  // ── Shared styles ─────────────────────────────
  const inputClass = `
    flex h-10 w-full rounded-md border border-input
    bg-background px-3 py-2 text-sm text-foreground
    shadow-sm transition-colors
    placeholder:text-muted-foreground
    focus-visible:outline-none focus-visible:ring-1
    focus-visible:ring-ring disabled:opacity-50
  `;

  const selectClass = `
    flex h-10 w-full rounded-md border border-input
    bg-background px-3 py-2 text-sm text-foreground
    shadow-sm transition-colors cursor-pointer
    focus-visible:outline-none focus-visible:ring-1
    focus-visible:ring-ring disabled:opacity-50
    appearance-none
  `;

  const labelClass = "block text-sm font-medium mb-2 text-foreground";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6 @container/main">
      {/* ── Header ────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ChevronLeftIcon className="size-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold font-[Montserrat] tracking-tight">
            Record Stock-Out
          </h2>
          <p className="text-sm text-muted-foreground">
            Log stock removed from inventory
          </p>
        </div>
      </div>

      {/* ── Success banner ────────────────────── */}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400">
          <CheckCircleIcon className="size-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Stock-out recorded!</p>
            <p className="text-xs opacity-80 mt-0.5">
              Inventory has been updated successfully.
            </p>
          </div>
        </div>
      )}

      {/* ── Error banner ──────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          <AlertTriangleIcon className="size-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* ── Two column layout ─────────────────── */}
      <div className="grid gap-6 @xl/main:grid-cols-3">
        {/* ── Left — Main form (2/3 width) ────── */}
        <div className="@xl/main:col-span-2 flex flex-col gap-4">
          {/* Product + Location */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Product Selection</CardTitle>
              <CardDescription>Choose the product and location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Product */}
              <div>
                <label className={labelClass}>
                  Product <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <select
                    value={productId}
                    onChange={(e) => {
                      setProductId(e.target.value);
                      setQuantity("");
                      setError("");
                      const prod = formData.products.find(
                        (p) => p._id === e.target.value,
                      );
                      if (prod?.locationId) setLocationId(prod.locationId);
                    }}
                    className={selectClass}
                  >
                    <option value="" disabled>
                      Select a product...
                    </option>
                    {formData.products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.sku} — {p.name} ({p.available} {p.unit} available)
                      </option>
                    ))}
                  </select>
                  {/* Custom chevron */}
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <ChevronDownIcon className="size-3.5" />
                  </div>
                </div>

                {/* Live stock indicator */}
                {selectedProduct && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      {
                        label: "On Hand",
                        value: selectedProduct.onHand,
                        color: "",
                      },
                      {
                        label: "Reserved",
                        value: selectedProduct.reserved,
                        color: "text-yellow-500",
                      },
                      {
                        label: "Available",
                        value: selectedProduct.available,
                        color: stockColor,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex flex-col items-center p-2.5 rounded-md bg-muted/50 border text-center"
                      >
                        <span className="text-xs text-muted-foreground">
                          {item.label}
                        </span>
                        <span
                          className={`text-lg font-bold mt-0.5 ${item.color}`}
                        >
                          {item.value}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {selectedProduct.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label className={labelClass}>
                  Location <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="" disabled>
                      Select location...
                    </option>
                    {formData.locations.map((l) => (
                      <option key={l._id} value={l._id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <ChevronDownIcon className="size-3.5" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quantity + Reason */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Stock-Out Details</CardTitle>
              <CardDescription>Quantity and reason for removal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Quantity */}
              <div>
                <label className={labelClass}>
                  Quantity <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedProduct?.available ?? undefined}
                  placeholder={
                    selectedProduct
                      ? `Max ${selectedProduct.available} ${selectedProduct.unit}`
                      : "Select a product first"
                  }
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setError("");
                  }}
                  disabled={!productId}
                  className={inputClass}
                />

                {/* Over-stock error */}
                {isOverStock && (
                  <div className="mt-2 flex items-center gap-1.5 text-destructive text-xs">
                    <AlertTriangleIcon className="size-3" />
                    Not enough stock. Available: {
                      selectedProduct?.available
                    }{" "}
                    {selectedProduct?.unit}
                  </div>
                )}

                {/* After deduction preview */}
                {selectedProduct && isValidQty && (
                  <div className="mt-2 flex items-center justify-between p-2.5 rounded-md bg-muted/50 border">
                    <span className="text-xs text-muted-foreground">
                      Remaining after this:
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        remaining <= 0
                          ? "text-destructive"
                          : remaining <= 20
                            ? "text-yellow-500"
                            : "text-green-500"
                      }`}
                    >
                      {remaining} {selectedProduct.unit}
                    </span>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className={labelClass}>
                  Reason <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className={selectClass}
                  >
                    {REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <ChevronDownIcon className="size-3.5" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reference + Notes */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                Additional Information
              </CardTitle>
              <CardDescription>Optional reference and notes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label className={labelClass}>
                  Reference Number
                  <span className="text-muted-foreground font-normal ml-1.5">
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Invoice no, order no, etc."
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Notes
                  <span className="text-muted-foreground font-normal ml-1.5">
                    (optional)
                  </span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Any additional information..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`
                    flex w-full rounded-md border border-input
                    bg-background px-3 py-2 text-sm text-foreground
                    shadow-sm transition-colors resize-none
                    placeholder:text-muted-foreground
                    focus-visible:outline-none focus-visible:ring-1
                    focus-visible:ring-ring
                  `}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right — Summary panel (1/3 width) ── */}
        <div className="flex flex-col gap-4">
          {/* Order summary */}
          <Card className="sticky top-20">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <MinusCircleIcon className="size-4 text-muted-foreground" />
                Stock-Out Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary rows */}
              <div className="space-y-3">
                {[
                  {
                    label: "Product",
                    value: selectedProduct?.name ?? "—",
                    mono: false,
                  },
                  {
                    label: "SKU",
                    value: selectedProduct?.sku ?? "—",
                    mono: true,
                  },
                  {
                    label: "Quantity",
                    value: quantity
                      ? `${quantity} ${selectedProduct?.unit ?? ""}`
                      : "—",
                    mono: false,
                  },
                  {
                    label: "Reason",
                    value: reason,
                    mono: false,
                  },
                  {
                    label: "Location",
                    value:
                      formData.locations.find((l) => l._id === locationId)
                        ?.name ?? "—",
                    mono: false,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between gap-2 text-sm py-1 border-b border-border/50 last:border-0"
                  >
                    <span className="text-muted-foreground shrink-0">
                      {row.label}
                    </span>
                    <span
                      className={`font-medium text-right ${row.mono ? "font-mono text-xs" : ""} ${!selectedProduct && row.label === "Product" ? "text-muted-foreground" : ""}`}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Remaining after */}
              {selectedProduct && isValidQty && (
                <div
                  className={`
                  p-3 rounded-lg border text-sm
                  ${
                    remaining <= 0
                      ? "bg-destructive/10 border-destructive/20 text-destructive"
                      : isLowAfter
                        ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                        : "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                  }
                `}
                >
                  <p className="font-semibold">
                    {remaining <= 0
                      ? "⚠ Stock will be empty!"
                      : isLowAfter
                        ? "⚠ Low stock after this"
                        : "✓ Stock level healthy"}
                  </p>
                  <p className="text-xs mt-0.5 opacity-80">
                    {remaining} {selectedProduct.unit} remaining
                  </p>
                </div>
              )}

              {/* Low stock warning */}
              {isLowAfter && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                  <AlertTriangleIcon className="size-4 text-yellow-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    A reorder suggestion may be triggered automatically after
                    this stock-out.
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  {submitting ? (
                    <>
                      <RefreshCwIcon className="animate-spin size-4 mr-2" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <MinusCircleIcon className="size-4 mr-2" />
                      Record Stock-Out
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.back()}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick tip card */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Quick Tips
              </p>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0">•</span>
                  Select Write-Off for damaged or expired items
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0">•</span>
                  Add invoice number as reference for sales
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0">•</span>
                  Stock-out triggers reorder check automatically
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
