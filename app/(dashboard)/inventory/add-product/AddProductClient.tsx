"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  PackagePlus,
  ArrowLeft,
  Boxes,
  Sparkles,
  Tag,
  DollarSign,
  ShieldAlert,
  Building2,
  RefreshCw,
  CheckCircle2,
  BrainCircuit,
  Upload,
} from "lucide-react";
import ImportProductsDialog from "../ImportProductsDialog";

export default function AddProductClient() {
  const router = useRouter();
  const createProduct = useMutation(api.inventory.createProduct);
  const locationsQ = useQuery(api.inventory.getStockInFormData);
  const categoriesQ = useQuery(api.inventory.getCategories);
  const suppliersQ = useQuery(api.inventory.getSuppliers);
  const nextSku = useQuery(api.inventory.getNextSku);

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [costPrice, setCostPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [reorderPoint, setReorderPoint] = useState(50);
  const [safetyStock, setSafetyStock] = useState(20);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [primarySupplierId, setPrimarySupplierId] = useState<string | undefined>(undefined);
  const [trackBatches, setTrackBatches] = useState(false);
  const [initialLocationId, setInitialLocationId] = useState<string | undefined>(undefined);
  const [initialQuantity, setInitialQuantity] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const locations = locationsQ?.locations ?? [];
  const categories = categoriesQ ?? [];
  const suppliers = suppliersQ ?? [];

  useEffect(() => {
    if (!sku && nextSku) setSku(nextSku);
  }, [nextSku, sku]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const id = await createProduct({
        sku,
        name,
        description: description || undefined,
        unit: unit as any,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        reorderPoint: Number(reorderPoint),
        safetyStock: Number(safetyStock),
        categoryId: categoryId ? (categoryId as any) : undefined,
        primarySupplierId: primarySupplierId ? (primarySupplierId as any) : undefined,
        trackBatches,
        initialLocationId: initialLocationId ? (initialLocationId as any) : undefined,
        initialQuantity: initialQuantity || undefined,
      });

      toast.success("New product SKU created successfully!");
      setConfirmOpen(false);
      router.push(`/inventory/${id}`);
    } catch (err) {
      toast.error((err as Error)?.message ?? "Failed to create product SKU");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !name) {
      toast.error("Please fill in SKU code and product name.");
      return;
    }
    setConfirmOpen(true);
  };

  const profitMargin = sellingPrice > 0 ? (((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">

      {/* ── HERO BANNER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
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
            <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs px-3 py-0.5">
              <PackagePlus className="w-3.5 h-3.5 mr-1 text-indigo-400" />
              SKU Registration Form
            </Badge>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Register New Product SKU
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Add a new item to your catalog, define safety stock thresholds, cost margins, and seed initial store inventory.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setImportOpen(true)}
          className="bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white rounded-xl h-9 px-4 text-xs font-semibold z-10 shrink-0 self-start lg:self-center"
        >
          <Upload className="w-3.5 h-3.5 mr-1.5 text-purple-400" /> Batch Import CSV
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT & CENTER: FORM FIELDS (2 COLS) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. Basic Product Info */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Product Identity & Unit Configuration
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Core product attributes, SKU code, and unit measurement.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    SKU Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. SKU-2001"
                    className="font-mono text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Fresh Milk 1L Pack"
                    className="text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Unit of Measure <span className="text-red-500">*</span></Label>
                  <Select value={unit || "pcs"} onValueChange={(v) => setUnit(v)}>
                    <SelectTrigger className="w-full text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Select unit..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">pcs (Pieces)</SelectItem>
                      <SelectItem value="kg">kg (Kilograms)</SelectItem>
                      <SelectItem value="g">g (Grams)</SelectItem>
                      <SelectItem value="l">l (Liters)</SelectItem>
                      <SelectItem value="ml">ml (Milliliters)</SelectItem>
                      <SelectItem value="pack">pack (Packets / Packs)</SelectItem>
                      <SelectItem value="box">box (Boxes / Cases)</SelectItem>
                      <SelectItem value="bottle">bottle (Bottles)</SelectItem>
                      <SelectItem value="can">can (Cans / Tins)</SelectItem>
                      <SelectItem value="unit">unit (General Units)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category</Label>
                  <Select
                    value={categoryId ?? "__none__"}
                    onValueChange={(v) => setCategoryId(v === "__none__" ? undefined : v)}
                  >
                    <SelectTrigger className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Choose Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Uncategorized</SelectItem>
                      {categories.map((category: any) => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Product Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter detailed specification, barcode, or handling notes..."
                  className="text-xs rounded-xl border-slate-200 dark:border-slate-800 resize-none min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. Pricing & Financials */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Pricing & Profit Margin Setup
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Define cost basis, selling price, and supplier relationships.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Cost Price (LKR)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Selling Price (LKR)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Primary Supplier</Label>
                  <Select
                    value={primarySupplierId ?? "__none__"}
                    onValueChange={(v) => setPrimarySupplierId(v === "__none__" ? undefined : v)}
                  >
                    <SelectTrigger className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Choose Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Primary Supplier</SelectItem>
                      {suppliers.map((supplier: any) => (
                        <SelectItem key={supplier._id} value={supplier._id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Safety Thresholds & Initial Seed */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Inventory Thresholds & Initial Stock Seed
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Automated reorder triggers and optional starting warehouse stock.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Reorder Point (Units)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={reorderPoint}
                    onChange={(e) => setReorderPoint(Number(e.target.value))}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 rounded-xl border-slate-200 dark:border-slate-800"
                  />
                  <p className="text-[11px] text-slate-500">Triggers automated purchase order draft when stock drops below this.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Safety Stock (Units)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={safetyStock}
                    onChange={(e) => setSafetyStock(Number(e.target.value))}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 rounded-xl border-slate-200 dark:border-slate-800"
                  />
                  <p className="text-[11px] text-slate-500">Emergency buffer for supplier lead-time delays.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Initial Location (Optional)</Label>
                  <Select value={initialLocationId} onValueChange={(v) => setInitialLocationId(v || undefined)}>
                    <SelectTrigger className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Choose Starting Warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((l: any) => (
                        <SelectItem key={l._id} value={l._id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Initial Stock Quantity (Optional)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 100"
                    value={initialQuantity ?? ""}
                    onChange={(e) => setInitialQuantity(e.target.value ? Number(e.target.value) : undefined)}
                    className="text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ── RIGHT: LIVE SKU SUMMARY CARD (1 COL) ── */}
        <div className="space-y-6">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm sticky top-24">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                SKU Registration Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">SKU Code</span>
                  <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400">{sku || "SKU-AUTO"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Product Name</span>
                  <span className="font-bold text-slate-900 dark:text-white max-w-[140px] truncate">{name || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Unit Type</span>
                  <Badge variant="outline" className="font-semibold text-[10px]">{unit}</Badge>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-700 dark:text-emerald-300 font-medium">Cost Basis</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">LKR {costPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-700 dark:text-emerald-300 font-medium">Selling Price</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">LKR {sellingPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-emerald-500/20">
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold">Est Profit Margin</span>
                  <Badge className="bg-emerald-600 text-white font-extrabold text-[10px]">{profitMargin}%</Badge>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-1.5 text-indigo-900 dark:text-indigo-200">
                <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
                  <BrainCircuit className="w-4 h-4" /> AI Inventory Safeguards
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Reorder trigger set at <span className="font-bold">{reorderPoint} units</span> with <span className="font-bold">{safetyStock} units</span> safety buffer.
                </p>
              </div>

            </CardContent>
            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={saving || !name || !sku}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl h-11 shadow-md border-0"
              >
                {saving ? (
                  <>
                    <RefreshCw className="animate-spin w-4 h-4 mr-2" /> Saving Product...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Register Product SKU
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

      </form>

      {/* Confirmation Modal */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold">Register SKU: {name} ({sku})?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will add the new product SKU to RetailMind AI catalog and initialize warehouse tracking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving} className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreate}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl"
            >
              {saving ? "Registering..." : "Confirm & Save SKU"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportProductsDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
