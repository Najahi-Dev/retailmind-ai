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
  MinusCircle,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
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

import { useAuth } from "@/lib/auth-context";

export default function StockOutClient({ role }: Props) {
  const router = useRouter();
  const { token } = useAuth();
  const formData = useQuery(api.inventory.getStockOutFormData, { token: token ?? undefined });
  const recordStockOut = useMutation(api.inventory.recordStockOut);

  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("Sale");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = formData?.products.find((p) => p._id === productId);
  const qtyNum = Number(quantity);
  const isOverStock = selectedProduct ? qtyNum > selectedProduct.available : false;
  const isValidQty = qtyNum > 0 && !isOverStock;
  const canSubmit = productId && locationId && quantity && isValidQty && !submitting;

  const remaining = selectedProduct ? selectedProduct.available - qtyNum : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await recordStockOut({
        productId: productId as Id<"products">,
        locationId: locationId as Id<"locations">,
        quantity: qtyNum,
        reason,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      toast.success(`Successfully recorded Stock-Out (-${qtyNum} units)!`);
      router.push("/inventory");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record stock-out.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!formData) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-slate-500 font-medium">
        <RefreshCw className="animate-spin w-6 h-6 text-red-600" />
        <span>Loading Stock-Out Engine...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full">

      {/* ── HERO BANNER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

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
            <Badge className="bg-red-500/20 text-red-300 border border-red-400/30 text-xs px-3 py-0.5">
              <TrendingDown className="w-3.5 h-3.5 mr-1 text-red-400" />
              Stock Outward Log
            </Badge>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Record Outward Stock Removal
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Log inventory reductions for POS sales, damaged goods, expired write-offs, or sample dispatches.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT & CENTER: FORM FIELDS (2 COLS) ── */}
        <div className="lg:col-span-2 space-y-6">

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-red-600 dark:text-red-400" />
                Product Selection & Warehouse Location
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Select the target item and origin location for stock removal.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Product SKU <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={productId}
                    onValueChange={(val) => {
                      setProductId(val);
                      const prod = formData.products.find((p) => p._id === val);
                      if (prod?.locationId) setLocationId(prod.locationId);
                    }}
                  >
                    <SelectTrigger className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Select Product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.products.map((p, idx) => (
                        <SelectItem key={`${p._id}_${idx}`} value={p._id}>
                          {p.sku} — {p.name} ({p.available} {p.unit} avail)
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
                      <SelectValue placeholder="Select Location..." />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.locations.map((l, idx) => (
                        <SelectItem key={`${l._id}_${idx}`} value={l._id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Removal Quantity <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={selectedProduct?.available ?? undefined}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder={selectedProduct ? `Max ${selectedProduct.available} ${selectedProduct.unit}` : "Enter quantity"}
                    className="text-xs font-extrabold text-red-600 dark:text-red-400 rounded-xl border-slate-200 dark:border-slate-800"
                    required
                  />
                  {isOverStock && (
                    <p className="text-xs text-red-500 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Insufficient stock ({selectedProduct?.available} available).
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Stock-Out Reason <span className="text-red-500">*</span>
                  </Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Choose reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      {REASONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Invoice / Order Reference</Label>
                  <Input
                    placeholder="e.g. INV-90421"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Internal Remarks</Label>
                  <Textarea
                    placeholder="Additional details regarding this stock removal..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
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
                <Sparkles className="w-4 h-4 text-red-600 dark:text-red-400" />
                Removal Impact Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">

              <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-red-700 dark:text-red-300 font-medium">Selected SKU</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{selectedProduct?.sku || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-700 dark:text-red-300 font-medium">Current Available</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedProduct?.available ?? 0} Units</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-red-500/20">
                  <span className="text-red-700 dark:text-red-300 font-bold">Remaining After Out</span>
                  <Badge className={`font-extrabold text-xs ${remaining < 20 ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
                    {remaining} Units
                  </Badge>
                </div>
              </div>

            </CardContent>
            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-lg h-11 shadow-md border-0"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="animate-spin w-4 h-4 mr-2" /> Processing Removal...
                  </>
                ) : (
                  <>
                    <MinusCircle className="w-4 h-4 mr-2" /> Confirm Stock-Out (-{qtyNum || 0})
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
