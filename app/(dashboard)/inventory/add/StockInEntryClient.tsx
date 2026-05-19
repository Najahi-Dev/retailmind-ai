"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangleIcon, ArrowLeftIcon, CheckCircle2Icon, PackageIcon, RefreshCwIcon, SparklesIcon, TrendingUpIcon } from "lucide-react";
import Link from "next/link";

interface Props {
  role: string;
}

const STATUS_CONFIG = {
  critical: { label: "Critical", className: "bg-destructive/10 text-destructive border-destructive/20" },
  low: { label: "Low Stock", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  healthy: { label: "Healthy", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  overstock: { label: "Overstock", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
} as const;

function formatLocationType(type: string) {
  return type.replaceAll("_", " ");
}

function formatDateTime(ts: number) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

export default function StockInEntryClient({ role }: Props) {
  const data = useQuery(api.inventory.getStockInFormData);
  const recordStockIn = useMutation(api.inventory.recordStockIn);

  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("Restock");
  const [lotNumber, setLotNumber] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canReceiveStock = ["admin", "manager"].includes(role);

  const products = data?.products ?? [];
  const locations = data?.locations ?? [];

  useEffect(() => {
    if (!productId && products[0]) {
      setProductId(products[0]._id);
    }
    if (!locationId && locations[0]) {
      setLocationId(locations[0]._id);
    }
  }, [productId, locationId, products, locations]);

  const selectedProduct = useMemo(
    () => products.find((product) => product._id === productId),
    [products, productId],
  );

  const selectedLocation = useMemo(
    () => locations.find((location) => location._id === locationId),
    [locations, locationId],
  );

  const projectedOnHand = (selectedProduct?.onHand ?? 0) + quantity;
  const projectedStatus = selectedProduct
    ? selectedProduct.status
    : "healthy";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedProduct || !selectedLocation) {
      toast.error("Pick a product and destination location first.");
      return;
    }

    if (quantity <= 0) {
      toast.error("Quantity must be greater than zero.");
      return;
    }

    setSubmitting(true);
    const submitPromise = recordStockIn({
      productId: selectedProduct._id as Id<"products">,
      locationId: selectedLocation._id as Id<"locations">,
      quantity,
      reason: reason.trim() || undefined,
      lotNumber: selectedProduct.trackBatches ? lotNumber.trim() || undefined : undefined,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    try {
      await toast.promise(submitPromise, {
        loading: "Saving stock receipt...",
        success: "Stock received and inventory updated.",
        error: (error) => error instanceof Error ? error.message : "Unable to save stock-in entry.",
      });

      await submitPromise;
      setQuantity(1);
      setReason("Restock");
      setLotNumber("");
      setReference("");
      setNotes("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  if (!canReceiveStock) {
    return null;
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCwIcon className="size-4 animate-spin" />
          Loading stock-in form...
        </div>
      </div>
    );
  }

  if (products.length === 0 || locations.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center p-6">
        <Card className="max-w-lg border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
              <PackageIcon className="size-6 text-muted-foreground" />
            </div>
            <CardTitle className="mt-3 text-xl">Stock-in setup needed</CardTitle>
            <CardDescription>
              {products.length === 0
                ? "No active products are available for receiving stock."
                : "No active receiving locations are available right now."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/inventory">
                <ArrowLeftIcon className="mr-2 size-4" />
                Back to inventory
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 @container/main">
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="bg-linear-to-br from-primary/12 via-card to-card px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-background/70">
                    <SparklesIcon className="mr-1 size-3" />
                    Stock receipt
                  </Badge>
                  <Badge variant="secondary">Live inventory update</Badge>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight font-[Montserrat]">
                  Stock In Entry
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Receive goods into a destination location, update on-hand stock,
                  and keep the movement trail consistent with the rest of the system.
                </p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-4 shadow-xs backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Active selection
                </div>
                <div className="mt-2 text-sm font-medium">
                  {selectedProduct?.name ?? "Pick a product"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {selectedLocation?.name ?? "Pick a location"}
                </div>
              </div>
            </div>
          </div>

          <CardContent className="space-y-6 p-6">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="product">Product</Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger id="product" className="w-full">
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product._id} value={product._id}>
                          {product.sku} · {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Receiving location</Label>
                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger id="location" className="w-full">
                      <SelectValue placeholder="Choose a location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location._id} value={location._id}>
                          {location.name} · {formatLocationType(location.type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity received</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    id="reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Restock, supplier delivery, transfer..."
                  />
                </div>

                {selectedProduct?.trackBatches && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="lotNumber">Lot / batch number</Label>
                    <Input
                      id="lotNumber"
                      value={lotNumber}
                      onChange={(event) => setLotNumber(event.target.value)}
                      placeholder="Batch or lot identifier"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reference">Reference</Label>
                  <Input
                    id="reference"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="PO, invoice, transfer note"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Optional receiving notes, damage observations, or verification details."
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/30 p-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Submission preview</div>
                  <div className="text-xs text-muted-foreground">
                    {quantity} {selectedProduct?.unit ?? "units"} will be added to {selectedLocation?.name ?? "the selected location"}.
                  </div>
                </div>
                <Button type="submit" disabled={submitting} className="min-w-40">
                  {submitting ? (
                    <>
                      <RefreshCwIcon className="mr-2 size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <PackageIcon className="mr-2 size-4" />
                      Record Stock In
                    </>
                  )}
                </Button>
              </div>

              {submitted && (
                <div className="flex items-center gap-2 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-600">
                  <CheckCircle2Icon className="size-4" />
                  Stock-in entry saved successfully.
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-linear-to-br from-primary/8 to-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Product snapshot</CardTitle>
              <CardDescription>Before and after the stock receipt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current status</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className={STATUS_CONFIG[projectedStatus].className} variant="outline">
                      {STATUS_CONFIG[projectedStatus].label}
                    </Badge>
                    {selectedProduct?.trackBatches && (
                      <Badge variant="secondary">Batch tracked</Badge>
                    )}
                  </div>
                </div>
                <TrendingUpIcon className="size-5 text-muted-foreground" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-background/70 p-3">
                  <div className="text-xs text-muted-foreground">On hand</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">{selectedProduct?.onHand ?? 0}</div>
                </div>
                <div className="rounded-xl border bg-background/70 p-3">
                  <div className="text-xs text-muted-foreground">Projected</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">{projectedOnHand}</div>
                </div>
                <div className="rounded-xl border bg-background/70 p-3">
                  <div className="text-xs text-muted-foreground">Reorder point</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">{selectedProduct?.reorderPoint ?? 0}</div>
                </div>
                <div className="rounded-xl border bg-background/70 p-3">
                  <div className="text-xs text-muted-foreground">Safety stock</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">{selectedProduct?.safetyStock ?? 0}</div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Stock level</span>
                  <span>{selectedProduct?.stockPct ?? 0}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${selectedProduct?.status === "critical"
                      ? "bg-destructive"
                      : selectedProduct?.status === "low"
                        ? "bg-yellow-500"
                        : selectedProduct?.status === "overstock"
                          ? "bg-blue-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${selectedProduct?.stockPct ?? 0}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedProduct
                    ? `Based on ${selectedProduct.reorderPoint * 5} units as the ceiling, aligned with the app's stock-level scale.`
                    : "Choose a product to see stock-level guidance."}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receiving location</CardTitle>
              <CardDescription>Where the movement will be logged</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm font-medium">{selectedLocation?.name ?? "No location selected"}</div>
              <div className="text-sm text-muted-foreground">
                {selectedLocation ? formatLocationType(selectedLocation.type) : "Select a destination location to continue."}
              </div>
              {selectedLocation?.address && (
                <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
                  {selectedLocation.address}
                </div>
              )}
              <Button asChild variant="outline" className="w-full">
                <Link href="/inventory">
                  <ArrowLeftIcon className="mr-2 size-4" />
                  Back to inventory
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}