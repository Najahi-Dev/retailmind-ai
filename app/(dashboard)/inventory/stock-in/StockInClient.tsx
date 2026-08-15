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
  TrendingUp,
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
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = formData?.products.find((p) => p._id === productId);
  const qtyNum = Number(quantity);
  const isValidQty = qtyNum > 0 && Number.isInteger(qtyNum);
  const canSubmit = productId && locationId && quantity && isValidQty && !submitting;

  const currentAvailable = selectedProduct?.onHand ?? 0;
  const newAvailable = selectedProduct ? currentAvailable + qtyNum : 0;

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
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-slate-500 font-medium">
        <RefreshCw className="animate-spin w-6 h-6 text-emerald-600" />
        <span>Loading Stock-In Engine...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full">

      {/* ── HERO BANNER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 rounded-xl shadow-xl border border-emerald-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

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
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs px-3 py-0.5">
              <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Stock Inward Log
            </Badge>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Record Inward Stock Addition
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Log inventory additions for new shipment arrivals, supplier deliveries, or stock returns.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT & CENTER: FORM FIELDS (2 COLS) ── */}
        <div className="lg:col-span-2 space-y-6">

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Product Selection & Warehouse Location
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Select the target item and destination location for stock addition.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Product SKU <span className="text-emerald-500">*</span>
                  </Label>
                  <Select
                    value={productId}
                    onValueChange={(val) => setProductId(val)}
                  >
                    <SelectTrigger className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Select Product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.products.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.sku} — {p.name} ({p.onHand} avail)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Location <span className="text-emerald-500">*</span>
                  </Label>
                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Select Location..." />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.locations.map((l) => (
                        <SelectItem key={l._id} value={l._id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Inward Quantity <span className="text-emerald-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                    className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 rounded-xl border-slate-200 dark:border-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Stock-In Reason <span className="text-emerald-500">*</span>
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
                    placeholder="Additional details regarding this stock addition..."
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
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Inward Impact Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">

              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-700 dark:text-emerald-300 font-medium">Selected SKU</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{selectedProduct?.sku || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-700 dark:text-emerald-300 font-medium">Current Available</span>
                  <span className="font-bold text-slate-900 dark:text-white">{currentAvailable} Units</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-emerald-500/20">
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold">New Total After In</span>
                  <Badge className="font-extrabold text-xs bg-emerald-600 text-white">
                    {newAvailable} Units
                  </Badge>
                </div>
              </div>

            </CardContent>
            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg h-11 shadow-md border-0"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="animate-spin w-4 h-4 mr-2" /> Processing Addition...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4 mr-2" /> Confirm Stock-In (+{qtyNum || 0})
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
