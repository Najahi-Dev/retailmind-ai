"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRightLeft,
  RefreshCw,
  Sparkles,
  Boxes,
  MapPin,
  CheckCircle2,
  Building2,
  Send,
} from "lucide-react";

interface Props {
  role?: string;
}

import { useAuth } from "@/lib/auth-context";

export default function StockTransferClient({ role = "admin" }: Props) {
  const router = useRouter();
  const { token } = useAuth();
  const data = useQuery(api.inventory.getStockControlFormData, { token: token ?? undefined });
  const transferStock = useMutation(api.inventory.transferStockBetweenLocations);

  const [productId, setProductId] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("Inter-branch stock rebalance");
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
      toast.error("Choose product and both source and target locations.");
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
        productId: selectedProduct._id as Id<"products">,
        fromLocationId: fromLocation._id as Id<"locations">,
        toLocationId: toLocation._id as Id<"locations">,
        quantity,
        reason: reason.trim() || undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success("Stock transferred successfully across branch locations.");
      router.push("/inventory");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to transfer stock.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canTransfer) return null;

  if (!data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-slate-500 font-medium">
        <RefreshCw className="animate-spin w-6 h-6 text-indigo-600" />
        <span>Loading Inter-Branch Transfer Engine...</span>
      </div>
    );
  }

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
            <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs px-3 py-0.5">
              <ArrowRightLeft className="w-3.5 h-3.5 mr-1 text-indigo-400" />
              Inter-Branch Transfer
            </Badge>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Inter-Branch Stock Transfer
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Rebalance inventory between central distribution warehouses and regional retail stores with real-time audit logging.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT & CENTER: FORM FIELDS (2 COLS) ── */}
        <div className="lg:col-span-2 space-y-6">

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Product & Warehouse Routing
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Select the target item, origin warehouse, and receiving store.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Product SKU <span className="text-red-500">*</span>
                  </Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Choose Product..." />
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

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Source Location (From) <span className="text-red-500">*</span>
                  </Label>
                  <Select value={fromLocationId} onValueChange={setFromLocationId}>
                    <SelectTrigger className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Choose Origin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location._id} value={location._id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Destination Location (To) <span className="text-red-500">*</span>
                  </Label>
                  <Select value={toLocationId} onValueChange={setToLocationId}>
                    <SelectTrigger className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Choose Destination..." />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location._id} value={location._id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Transfer Quantity <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 rounded-xl border-slate-200 dark:border-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Transfer Reason</Label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Demand spike rebalance"
                    className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Dispatch Manifest / Ticket Ref</Label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. TR-2026-881"
                    className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Handling Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide logistics or transport instructions..."
                    className="text-xs rounded-xl border-slate-200 dark:border-slate-800 resize-none min-h-[80px]"
                  />
                </div>

              </div>
            </CardContent>
          </Card>

        </div>

        {/* ── RIGHT: SUMMARY PANEL (1 COL) ── */}
        <div className="space-y-6">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm sticky top-24">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Transfer Routing Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">

              <div className="p-3.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-indigo-700 dark:text-indigo-300 font-medium">Source Available</span>
                  <Badge variant="outline" className="font-bold text-xs">{fromAvailable} Units</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-indigo-700 dark:text-indigo-300 font-medium">Projected Source</span>
                  <Badge className={`font-bold text-xs ${projectedSource < 0 ? "bg-red-600 text-white" : "bg-indigo-600 text-white"}`}>
                    {projectedSource} Units
                  </Badge>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-indigo-500/20">
                  <span className="text-indigo-700 dark:text-indigo-300 font-bold">Projected Destination</span>
                  <Badge className="bg-emerald-600 text-white font-extrabold text-xs">{projectedDestination} Units</Badge>
                </div>
              </div>

            </CardContent>
            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={submitting || !fromLocation || !toLocation || fromLocation._id === toLocation._id || quantity <= 0}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-lg h-11 shadow-md border-0"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="animate-spin w-4 h-4 mr-2" /> Dispatching Transfer...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" /> Confirm Stock Transfer ({quantity})
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

      </form>

    </div>
  );
}
