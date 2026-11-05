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

import { useAuth } from "@/lib/auth-context";

export default function TransferClient({ role }: Props) {
  const { token } = useAuth();
  const data = useQuery(api.inventory.getStockControlFormData, { token: token ?? undefined });
  const transferStock = useMutation(api.inventory.transferStockBetweenLocations);

  const [productId, setProductId] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("Stock transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canTransfer = ["admin", "manager"].includes(role);

  const products = data?.products ?? [];
  const locations = data?.locations ?? [];
  const inventory = data?.inventory ?? [];

  useEffect(() => {
    if (!productId && products[0]) {
      setProductId(products[0]._id);
    }

    if (!fromLocationId && locations[0]) {
      setFromLocationId(locations[0]._id);
    }

    if (!toLocationId && locations[1]) {
      setToLocationId(locations[1]._id);
    }
  }, [productId, fromLocationId, toLocationId, products, locations]);

  useEffect(() => {
    if (fromLocationId && toLocationId && fromLocationId === toLocationId) {
      const alternate = locations.find((location) => location._id !== fromLocationId);
      if (alternate) {
        setToLocationId(alternate._id);
      }
    }
  }, [fromLocationId, toLocationId, locations]);

  const selectedProduct = useMemo(
    () => products.find((product) => product._id === productId),
    [products, productId],
  );

  const fromLocation = useMemo(
    () => locations.find((location) => location._id === fromLocationId),
    [locations, fromLocationId],
  );

  const toLocation = useMemo(
    () => locations.find((location) => location._id === toLocationId),
    [locations, toLocationId],
  );

  const fromEntry = useMemo(
    () => inventory.find((entry) => entry.productId === productId && entry.locationId === fromLocationId),
    [inventory, productId, fromLocationId],
  );

  const toEntry = useMemo(
    () => inventory.find((entry) => entry.productId === productId && entry.locationId === toLocationId),
    [inventory, productId, toLocationId],
  );

  const fromAvailable = fromEntry?.available ?? 0;
  const projectedSource = fromAvailable - quantity;
  const projectedDestination = (toEntry?.onHand ?? 0) + quantity;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedProduct || !fromLocation || !toLocation) {
      toast.error("Choose product and both locations.");
      return;
    }

    if (fromLocation._id === toLocation._id) {
      toast.error("Source and destination locations must be different.");
      return;
    }

    if (quantity <= 0) {
      toast.error("Transfer quantity must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      await transferStock({
        token: token ?? undefined,
        productId: selectedProduct._id as Id<"products">,
        fromLocationId: fromLocation._id as Id<"locations">,
        toLocationId: toLocation._id as Id<"locations">,
        quantity,
        reason: reason.trim() || undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success("Stock transferred successfully.");
      setQuantity(1);
      setReference("");
      setNotes("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to transfer stock.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canTransfer) return null;

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCwIcon className="size-4 animate-spin" />
          Loading stock transfer form...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5">
      <Card>
        <CardHeader>
          <CardTitle>Stock Transfer</CardTitle>
          <CardDescription>
            Move stock between locations with transfer-out and transfer-in movement logs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
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
                <Label htmlFor="fromLocation">From location</Label>
                <Select value={fromLocationId} onValueChange={setFromLocationId}>
                  <SelectTrigger id="fromLocation"><SelectValue placeholder="Choose source" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location._id} value={location._id}>{location.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="toLocation">To location</Label>
                <Select value={toLocationId} onValueChange={setToLocationId}>
                  <SelectTrigger id="toLocation"><SelectValue placeholder="Choose destination" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location._id} value={location._id}>{location.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quantity">Transfer quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Rebalance, replenishment, dispatch prep..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="Transfer note, ticket id"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional handling notes"
                />
              </div>
            </div>

            <div className="grid gap-3 rounded-md border bg-muted/30 p-3 text-sm md:grid-cols-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Available at source</span>
                <Badge variant="outline">{fromAvailable}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Projected source after transfer</span>
                <Badge variant={projectedSource < 0 ? "destructive" : "default"}>{projectedSource}</Badge>
              </div>
              <div className="flex items-center justify-between md:col-span-2">
                <span className="text-muted-foreground">Projected destination on hand</span>
                <Badge variant="secondary">{projectedDestination}</Badge>
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2">
              <Button asChild type="button" variant="outline">
                <Link href="/inventory">
                  <ArrowLeftIcon className="mr-2 size-4" />
                  Back to inventory
                </Link>
              </Button>
              <Button
                type="submit"
                disabled={
                  submitting ||
                  !fromLocation ||
                  !toLocation ||
                  fromLocation._id === toLocation._id ||
                  quantity <= 0
                }
              >
                {submitting ? "Transferring..." : "Transfer Stock"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
