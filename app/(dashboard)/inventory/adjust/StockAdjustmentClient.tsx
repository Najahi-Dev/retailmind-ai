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
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
} from "lucide-react";

interface Props {
  role?: string;
}

import { useAuth } from "@/lib/auth-context";

export default function StockAdjustmentClient({ role = "admin" }: Props) {
  const router = useRouter();
  const { token } = useAuth();
  const data = useQuery(api.inventory.getStockControlFormData, { token: token ?? undefined });
  const adjustStock = useMutation(api.inventory.recordStockAdjustment);

  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [adjustedOnHand, setAdjustedOnHand] = useState(0);
  const [reason, setReason] = useState("Manual audit discrepancy correction");
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
      router.push("/inventory");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to adjust stock.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canAdjust) return null;

  if (!data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-slate-500 font-medium">
        <RefreshCw className="animate-spin w-6 h-6 text-amber-600" />
        <span>Loading Stock Adjustment Engine...</span>
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
            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs px-3 py-0.5">
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-amber-400" />
              Stock Audit Adjustment
            </Badge>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Manual Stock Adjustment Override
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Reconcile physical stock counts with digital inventory system totals for damaged goods, audit corrections, or shrinkage.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT & CENTER: FORM FIELDS (2 COLS) ── */}
        <div className="lg:col-span-2 space-y-6">

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Target SKU & Location Setup
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Select the item and warehouse location requiring stock level adjustment.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Product SKU <span className="text-red-500">*</span>
                  </Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Choose product..." />
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
                    Location <span className="text-red-500">*</span>
                  </Label>
                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Choose location..." />
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
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Current System On Hand</Label>
                  <Input
                    value={currentOnHand}
                    readOnly
                    className="text-xs font-bold bg-slate-100 dark:bg-slate-800/80 rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Physical Counted Stock <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={adjustedOnHand}
                    onChange={(e) => setAdjustedOnHand(Number(e.target.value))}
                    className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 rounded-xl border-slate-200 dark:border-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Adjustment Reason</Label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Audit discrepancy, damaged stock write-off"
                    className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Audit Sheet / Reference Code</Label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. AUDIT-2026-Q3-04"
                    className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Internal Audit Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide additional details regarding the stock variance..."
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
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Net Variance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">

              <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-amber-700 dark:text-amber-300 font-medium">Product</span>
                  <span className="font-bold text-slate-900 dark:text-white max-w-[140px] truncate">{selectedProduct?.name || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-amber-700 dark:text-amber-300 font-medium">Location</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedLocation?.name || "—"}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-amber-500/20">
                  <span className="text-amber-700 dark:text-amber-300 font-bold">Net Stock Delta</span>
                  <Badge
                    className={`font-extrabold text-xs px-2.5 py-0.5 ${
                      delta === 0
                        ? "bg-slate-200 text-slate-800"
                        : delta > 0
                          ? "bg-emerald-600 text-white"
                          : "bg-red-600 text-white"
                    }`}
                  >
                    {delta > 0 ? `+${delta}` : delta} Units
                  </Badge>
                </div>
              </div>

            </CardContent>
            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={submitting || delta === 0}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-lg h-11 shadow-md border-0"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="animate-spin w-4 h-4 mr-2" /> Applying Adjustment...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Apply Adjustment ({delta > 0 ? `+${delta}` : delta})
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
