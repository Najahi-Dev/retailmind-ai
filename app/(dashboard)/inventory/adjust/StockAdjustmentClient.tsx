"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeftIcon, RefreshCwIcon } from "lucide-react";

interface Props {
  role: string;
}

export default function StockAdjustmentClient({ role }: Props) {
  const data = useQuery(api.inventory.getStockControlFormData);
  const adjustStock = useMutation(api.inventory.recordStockAdjustment);

  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [adjustedOnHand, setAdjustedOnHand] = useState(0);
  const [reason, setReason] = useState("Manual discrepancy correction");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canAdjust = ["admin", "manager"].includes(role);

  const products = data?.products ?? [];
  const locations = data?.locations ?? [];
  const inventory = data?.inventory ?? [];

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

  const currentEntry = useMemo(
    () => inventory.find((entry) => entry.productId === productId && entry.locationId === locationId),
    [inventory, productId, locationId],
  );

  const currentOnHand = currentEntry?.onHand ?? 0;
  const delta = adjustedOnHand - currentOnHand;

  useEffect(() => {
    setAdjustedOnHand(currentOnHand);
  }, [currentOnHand]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedProduct || !selectedLocation) {
      toast.error("Choose both product and location.");
      return;
    }

    if (adjustedOnHand < 0) {
      toast.error("Adjusted stock cannot be negative.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await adjustStock({
        productId: selectedProduct._id as Id<"products">,
        locationId: selectedLocation._id as Id<"locations">,
        adjustedOnHand,
        reason: reason.trim() || undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(`Stock adjusted (${result.delta > 0 ? "+" : ""}${result.delta}).`);
      setReference("");
      setNotes("");
      setAdjustedOnHand(result.adjustedOnHand);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to adjust stock.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canAdjust) return null;

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCwIcon className="size-4 animate-spin" />
          Loading stock adjustment form...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Stock Adjustment</CardTitle>
          <CardDescription>
            Manual override for discrepancy corrections with full movement logging.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="product">Product</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger id="product"><SelectValue placeholder="Choose product" /></SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product._id} value={product._id}>
                        {product.sku} · {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger id="location"><SelectValue placeholder="Choose location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location._id} value={location._id}>{location.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="current">Current On Hand</Label>
                <Input id="current" value={currentOnHand} readOnly />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adjusted">Adjusted On Hand</Label>
                <Input
                  id="adjusted"
                  type="number"
                  min={0}
                  value={adjustedOnHand}
                  onChange={(event) => setAdjustedOnHand(Number(event.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Damaged count correction, audit mismatch, etc."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="Audit sheet, incident id, etc."
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional internal notes"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
              <div className="text-sm text-muted-foreground">
                Net change
              </div>
              <Badge variant={delta === 0 ? "outline" : delta > 0 ? "default" : "destructive"}>
                {delta > 0 ? "+" : ""}{delta}
              </Badge>
            </div>

            <div className="flex flex-wrap justify-between gap-2">
              <Button asChild type="button" variant="outline">
                <Link href="/inventory">
                  <ArrowLeftIcon className="mr-2 size-4" />
                  Back to inventory
                </Link>
              </Button>
              <Button type="submit" disabled={submitting || delta === 0}>
                {submitting ? "Applying..." : "Apply Adjustment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
