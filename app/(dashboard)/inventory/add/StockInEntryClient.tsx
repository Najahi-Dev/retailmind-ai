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
  PackageCheck,
  RefreshCw,
  Sparkles,
  MapPin,
  FileText,
  Building2,
  Calendar,
  CheckCircle2,
  Layers,
} from "lucide-react";

interface Props {
  role?: string;
}

export default function StockInEntryClient({ role = "admin" }: Props) {
  const router = useRouter();
  const data = useQuery(api.inventory.getStockInFormData);
  const suppliersData = useQuery(api.inventory.getSuppliers);
  const recordStockIn = useMutation(api.inventory.recordStockIn);

  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("Restock");
  const [lotNumber, setLotNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const products = data?.products ?? [];
  const locations = data?.locations ?? [];
  const suppliers = suppliersData ?? [];

  const selectedProduct = products.find((p) => p._id === productId);
  const selectedLocation = locations.find((l) => l._id === locationId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !locationId || quantity <= 0) {
      toast.error("Please select product, warehouse location, and valid quantity.");
      return;
    }

    setSubmitting(true);
    try {
      await recordStockIn({
        productId: productId as Id<"products">,
        locationId: locationId as Id<"locations">,
        quantity,
        reason,
        lotNumber: lotNumber.trim() || undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(`Successfully logged +${quantity} units Stock In!`);
      router.push("/inventory");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record stock in");
    } finally {
      setSubmitting(false);
    }
  };

  if (!data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-slate-500 font-medium">
        <RefreshCw className="animate-spin w-6 h-6 text-indigo-600" />
        <span>Loading Stock In Entry Form...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">

      {/* ── HERO BANNER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

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
              <PackageCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Stock Inward Log
            </Badge>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Record Inward Stock Shipment
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Log restocks, purchase order deliveries, or supplier inward shipments with lot numbers and expiry dates.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT & CENTER: FORM FIELDS (2 COLS) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. Item & Location */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Product SKU & Receiving Warehouse
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Select the target product and destination store or warehouse.
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
                      <SelectValue placeholder="Choose SKU..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.sku} · {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Receiving Location <span className="text-red-500">*</span>
                  </Label>
                  <Select value={locationId} onValueChange={setLocationId}>
                    <SelectTrigger className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Choose Warehouse..." />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => (
                        <SelectItem key={l._id} value={l._id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Inward Quantity <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 rounded-xl border-slate-200 dark:border-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Inward Reason</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Restock">Supplier Restock</SelectItem>
                      <SelectItem value="PO Delivery">Purchase Order Delivery</SelectItem>
                      <SelectItem value="Return Credit">Customer Return to Stock</SelectItem>
                      <SelectItem value="Audit Addition">Audit Count Addition</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* 2. Lot & Expiry Tracking */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Batch, Expiry & Supplier Metadata
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Optional batch lot number, expiration date for perishables, and vendor invoice reference.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Batch / Lot Number</Label>
                  <Input
                    placeholder="e.g. BATCH-2026-08A"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    className="text-xs font-mono rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Expiry Date</Label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Supplier Vendor</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Choose Supplier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s: any) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Reference / GRN No</Label>
                  <Input
                    placeholder="e.g. GRN-99841"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Handling Notes</Label>
                  <Input
                    placeholder="e.g. Temperature checked at receiving dock"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ── RIGHT: SUMMARY SIDEBAR (1 COL) ── */}
        <div className="space-y-6">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm sticky top-24">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Inward Movement Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">

              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-700 dark:text-emerald-300 font-medium">Selected SKU</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{selectedProduct?.sku || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-700 dark:text-emerald-300 font-medium">Inward Addition</span>
                  <Badge className="bg-emerald-600 text-white font-extrabold text-xs">+ {quantity} Units</Badge>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-emerald-500/20">
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold">Target Location</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedLocation?.name || "—"}</span>
                </div>
              </div>

            </CardContent>
            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={submitting || !productId || !locationId || quantity <= 0}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg h-11 shadow-md border-0"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="animate-spin w-4 h-4 mr-2" /> Processing Inward...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Stock In (+{quantity})
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