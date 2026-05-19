"use client";
import { useQuery, useMutation } from "convex/react";
import { api }    from "@/convex/_generated/api";
import { Id }     from "@/convex/_generated/dataModel";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge }   from "@/components/ui/badge";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeftIcon, CheckCircleIcon, XCircleIcon,
  AlertTriangleIcon, PackageIcon, RefreshCwIcon,
} from "lucide-react";

const URGENCY_CONFIG = {
  critical: { label: "Critical", variant: "destructive" as const },
  high:     { label: "High",     variant: "secondary"   as const },
  medium:   { label: "Medium",   variant: "outline"     as const },
  low:      { label: "Low",      variant: "outline"     as const },
};

export default function ReorderReviewClient({
  suggestionId,
}: {
  suggestionId: string;
}) {
  const router   = useRouter();
  const detail   = useQuery(api.reorder.getReorderDetail, {
    suggestionId: suggestionId as Id<"reorderSuggestions">,
  });
  const approve  = useMutation(api.reorder.approveSuggestion);
  const dismiss  = useMutation(api.reorder.dismissSuggestion);

  const [quantity,   setQuantity]   = useState<number | "">("");
  const [unitCost,   setUnitCost]   = useState<number | "">("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(val);

  // Pre-fill when data loads
  if (detail && quantity === "" && unitCost === "") {
    setQuantity(detail.suggestion.suggestedQuantity);
    setUnitCost(detail.product?.costPrice ?? 0);
    setSupplierId(detail.suggestion.preferredSupplierId ?? "");
  }

  const handleApprove = async () => {
    if (!quantity || !unitCost || !supplierId) return;
    setSubmitting(true);
    try {
      const result = await approve({
        suggestionId: suggestionId as Id<"reorderSuggestions">,
        supplierId:   supplierId as Id<"suppliers">,
        quantity:     Number(quantity),
        unitCost:     Number(unitCost),
      });
      router.push(`/reorders/purchase-orders`);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    await dismiss({ suggestionId: suggestionId as Id<"reorderSuggestions"> });
    router.push("/reorders");
  };

  if (!detail) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-6 text-muted-foreground">
        <RefreshCwIcon className="animate-spin size-4" />
        Loading...
      </div>
    );
  }

  const { suggestion, product, inventory, allSuppliers } = detail;

  const totalValue = Number(quantity || 0) * Number(unitCost || 0);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 @container/main">

      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ChevronLeftIcon className="size-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold font-[Montserrat]">
              Review Reorder
            </h2>
            <Badge variant={URGENCY_CONFIG[suggestion.urgency].variant}>
              <AlertTriangleIcon className="size-3 mr-1" />
              {URGENCY_CONFIG[suggestion.urgency].label}
            </Badge>
            {suggestion.status !== "pending" && (
              <Badge variant="secondary" className="capitalize">
                {suggestion.status}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {product?.sku} · {product?.name}
          </p>
        </div>
      </div>

      <div className="grid gap-4 @xl/main:grid-cols-2">

        {/* Left — AI rationale + stock info */}
        <div className="flex flex-col gap-4">

          {/* AI Rationale */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangleIcon className="size-4 text-muted-foreground" />
                Reorder Rationale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {suggestion.rationale}
              </p>
              {suggestion.orderByDate && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Order by:</span>
                  <Badge variant="outline">
                    {new Date(suggestion.orderByDate).toLocaleDateString("en-US", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock levels */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PackageIcon className="size-4 text-muted-foreground" />
                Current Stock Levels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "On Hand",       value: `${inventory?.onHand ?? 0} ${product?.unit}`,      highlight: false },
                { label: "Available",     value: `${inventory?.available ?? 0} ${product?.unit}`,   highlight: false },
                { label: "Safety Stock",  value: `${product?.safetyStock ?? 0} ${product?.unit}`,   highlight: (inventory?.onHand ?? 0) <= (product?.safetyStock ?? 0) },
                { label: "Reorder Point", value: `${product?.reorderPoint ?? 0} ${product?.unit}`,  highlight: (inventory?.onHand ?? 0) <= (product?.reorderPoint ?? 0) },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className={`text-sm font-medium ${row.highlight ? "text-destructive" : ""}`}>
                    {row.value}
                  </span>
                </div>
              ))}

              {/* Stock gauge */}
              <div className="pt-1">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      suggestion.urgency === "critical" ? "bg-destructive" :
                      suggestion.urgency === "high"     ? "bg-orange-500"  :
                      "bg-yellow-500"
                    }`}
                    style={{
                      width: `${Math.min(100, ((inventory?.onHand ?? 0) / ((product?.reorderPoint ?? 1) * 5)) * 100)}%`
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right — Order form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Purchase Order</CardTitle>
            <CardDescription>
              Review and adjust before approving
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Supplier */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Supplier</label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {allSuppliers?.map(s => (
                    <SelectItem key={s._id} value={s._id}>
                      <div className="flex items-center gap-2">
                        <span>{s.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.leadTimeDays}d lead time
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Order Quantity ({product?.unit})
              </label>
              <Input
                type="number"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                Suggested: {suggestion.suggestedQuantity} units
              </p>
            </div>

            {/* Unit cost */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unit Cost (LKR)</label>
              <Input
                type="number"
                value={unitCost}
                onChange={e => setUnitCost(Number(e.target.value))}
                min={0}
              />
            </div>

            {/* Order summary */}
            <div className="rounded-lg bg-muted/50 border p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Order Summary
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantity</span>
                <span className="font-medium">{quantity || 0} {product?.unit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unit Cost</span>
                <span className="font-medium">{formatCurrency(Number(unitCost || 0))}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2 font-semibold">
                <span>Total Value</span>
                <span>{formatCurrency(totalValue)}</span>
              </div>
            </div>

            {/* Actions */}
            {suggestion.status === "pending" ? (
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1"
                  onClick={handleApprove}
                  disabled={submitting || !supplierId || !quantity || !unitCost}
                >
                  {submitting ? (
                    <RefreshCwIcon className="animate-spin size-4 mr-2" />
                  ) : (
                    <CheckCircleIcon className="size-4 mr-2" />
                  )}
                  Approve & Create PO
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDismiss}
                  disabled={submitting}
                >
                  <XCircleIcon className="size-4 mr-1" />
                  Dismiss
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center py-3">
                <Badge
                  variant={suggestion.status === "approved" ? "default" : "secondary"}
                  className="text-sm px-4 py-2 capitalize"
                >
                  {suggestion.status === "approved" ? (
                    <><CheckCircleIcon className="size-3 mr-2" />Approved — PO Created</>
                  ) : (
                    "Dismissed"
                  )}
                </Badge>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}