"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Boxes,
  PlusCircle,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  PackagePlusIcon,
} from "lucide-react";

interface Props {
  role: string;
}

const REASONS = [
  "New Stock Received",
  "Supplier Purchase Delivery",
  "Customer Return",
  "Stock Transfer In",
  "Audit Adjustment",
  "Sample Return",
  "Other",
];

export default function StockInClient({ role }: Props) {
  const router = useRouter();
  const formData = useQuery(api.inventory.getStockInFormData);
  const recordStockIn = useMutation(api.inventory.recordStockIn);

  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("New Stock Received");
  const [reference, setReference] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = formData?.products.find((p) => p._id === productId);
  const qtyNum = Number(quantity);
  const isValidQty = qtyNum > 0 && Number.isInteger(qtyNum);
  const canSubmit = productId && locationId && quantity && isValidQty && !submitting;

  const currentOnHand = selectedProduct?.onHand ?? 0;
  const newOnHand = selectedProduct ? currentOnHand + qtyNum : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await recordStockIn({
        productId: productId as Id<"products">,
        locationId: locationId as Id<"locations">,
        quantity: qtyNum,
        reason,
        lotNumber: lotNumber.trim() || undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(`Successfully added ${qtyNum} units to stock!`);
      router.push("/inventory");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record stock-in.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!formData) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-12 text-slate-500 font-semibold text-xs">
        <RefreshCw className="animate-spin size-4 text-emerald-500" />
        Loading stock-in form specs...
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full max-w-4xl mx-auto">
      {/* Back Button */}
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Inventory
        </Button>
      </div>

      {/* Hero Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-emerald-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-4 relative z-10">
          <div className="size-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Record Inventory Stock-In
              </h1>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs px-2.5 py-0.5">
                Staff Stock Receiving
              </Badge>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed max-w-xl">
              Add new product inventory batches received from suppliers, returns, or stock replenishment entries into store branch locations.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form & Calculation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Form (2 cols) */}
        <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PackagePlusIcon className="w-4 h-4 text-emerald-500" />
              Stock Receiving Details
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Select product and branch location to increase available inventory.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-5">
              {/* Product Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Product <span className="text-emerald-500">*</span>
                </Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Choose a product to stock-in..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 rounded-xl border-slate-200 dark:border-slate-800">
                    {formData.products.map((p) => (
                      <SelectItem key={p._id} value={p._id} className="text-xs py-2">
                        <div className="flex items-center justify-between gap-3 w-full">
                          <span className="font-semibold text-slate-900 dark:text-white">{p.name}</span>
                          <span className="font-mono text-[10px] text-slate-400">SKU: {p.sku} (Available: {p.onHand})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Store Branch / Location <span className="text-emerald-500">*</span>
                </Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Select target store location..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                    {formData.locations.map((loc) => (
                      <SelectItem key={loc._id} value={loc._id} className="text-xs py-2">
                        {loc.name} ({loc.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity & Reason Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Stock Quantity to Add <span className="text-emerald-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 50"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Stock-In Reason
                  </Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                      {REASONS.map((r) => (
                        <SelectItem key={r} value={r} className="text-xs py-1.5">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Reference & Lot Number Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Reference / PO / Invoice # (Optional)
                  </Label>
                  <Input
                    placeholder="e.g. PO-2026-9041 / INV-882"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-800 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Batch / Lot # (Optional)
                  </Label>
                  <Input
                    placeholder="e.g. BATCH-2026-08"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Additional Receiving Remarks
                </Label>
                <Textarea
                  rows={2}
                  placeholder="e.g. Received 50 units in good condition from Ceylon Traders shipment."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-xs rounded-xl border-slate-200 dark:border-slate-800 resize-none"
                />
              </div>
            </CardContent>

            <CardFooter className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="h-10 text-xs font-semibold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit}
                className="h-10 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md border-0"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Recording...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Confirm & Stock-In
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Right Summary & Impact Card */}
        <div className="space-y-4">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-500" /> Stock Calculation Preview
            </h3>

            {selectedProduct ? (
              <div className="space-y-3 pt-1">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Selected Product:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedProduct.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>SKU Code:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedProduct.sku}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Current Stock On Hand:</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{currentOnHand} units</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> Stock Addition:
                    </span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                      +{isValidQty ? qtyNum : 0} units
                    </span>
                  </div>

                  <div className="pt-2 border-t border-emerald-500/20 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">New Total Stock:</span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                      {isValidQty ? newOnHand : currentOnHand} units
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 font-medium bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                Select a product above to preview stock calculation impact.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
