"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeftIcon,
  PackageIcon,
  SaveIcon,
  Trash2Icon,
  TagIcon,
  Building2Icon,
  TrendingUpIcon,
  AlertTriangleIcon,
  SparklesIcon,
} from "lucide-react";
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

import { useAuth } from "@/lib/auth-context";

export default function EditProductClient({ productId, role }: { productId: string; role: string }) {
  const router = useRouter();
  const { token } = useAuth();
  const detail = useQuery(api.inventory.getProductDetail, token ? { productId: productId as Id<"products">, token } : "skip");
  const categoriesQ = useQuery(api.inventory.getCategories, { token: token ?? undefined });
  const suppliersQ = useQuery(api.inventory.getSuppliers, { token: token ?? undefined });
  const edit = useMutation(api.inventory.editProduct);
  const del = useMutation(api.inventory.deleteProduct);

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [primarySupplierId, setPrimarySupplierId] = useState<string | undefined>(undefined);
  const [costPrice, setCostPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [reorderPoint, setReorderPoint] = useState(0);
  const [safetyStock, setSafetyStock] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!detail?.product) return;
    setSku(detail.product.sku || "");
    setName(detail.product.name || "");
    setDescription(detail.product.description || "");
    setUnit(detail.product.unit || "");
    setCategoryId(detail.product.categoryId || undefined);
    setPrimarySupplierId(detail.product.primarySupplierId || undefined);
    setCostPrice(detail.product.costPrice || 0);
    setSellingPrice(detail.product.sellingPrice || 0);
    setReorderPoint(detail.product.reorderPoint || 0);
    setSafetyStock(detail.product.safetyStock || 0);
  }, [detail?.product]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await edit({
        token: token ?? undefined,
        productId: productId as Id<"products">,
        sku,
        name,
        description,
        unit: unit as any,
        categoryId: categoryId ? (categoryId as any) : undefined,
        primarySupplierId: primarySupplierId ? (primarySupplierId as any) : undefined,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        reorderPoint: Number(reorderPoint),
        safetyStock: Number(safetyStock),
      });

      // ── GUARDRAIL: Price drop was blocked, pending super admin approval ──
      if ((result as any)?.blocked) {
        toast.warning((result as any).reason, { duration: 8000 });
        return; // Stay on edit page — price not changed yet
      }

      toast.success("Product SKU updated successfully");
      router.push(`/inventory/${productId}`);
    } catch (err) {
      toast.error((err as Error)?.message ?? "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await del({ token: token ?? undefined, productId: productId as Id<"products"> });
      toast.success("Product removed from catalog");
      router.push(`/inventory`);
    } catch (err) {
      toast.error((err as Error)?.message ?? "Delete failed");
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(val);

  if (!detail) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-12 text-slate-500 gap-2 font-semibold">
        <SparklesIcon className="animate-spin size-6 text-indigo-500" />
        Fetching product specifications...
      </div>
    );
  }

  if (!detail.product) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-12 text-slate-500 gap-3">
        <PackageIcon className="size-10 text-indigo-500/40" />
        <p className="font-bold text-slate-900 dark:text-white">Product Not Found</p>
        <Button variant="outline" onClick={() => router.back()}>
          Return to Inventory
        </Button>
      </div>
    );
  }

  const canEdit = ["admin", "manager"].includes(role);
  const canViewFinancials = ["admin", "manager"].includes(role);
  const categories = categoriesQ ?? [];
  const suppliers = suppliersQ ?? [];

  const profitMargin = sellingPrice > 0 ? Math.round(((sellingPrice - costPrice) / sellingPrice) * 100) : 0;
  const netProfit = sellingPrice - costPrice;

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full">
      {/* ── 1. HERO HEADER BANNER ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push(`/inventory/${productId}`)}
              className="shrink-0 size-10 rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeftIcon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Edit Product SKU Configuration
                </h1>
                <Badge className="text-xs font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5">
                  SKU: {sku || detail.product.sku}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Update master product record, category mapping, pricing rules, and safety stock thresholds.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => router.push(`/inventory/${productId}`)}
              className="h-9 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setSaveOpen(true)}
              disabled={!canEdit || saving}
              className="h-9 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-5 shadow-sm border-0"
            >
              <SaveIcon className="w-4 h-4 mr-1.5" /> Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. TWO COLUMN EDITOR GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column — Form Fields */}
        <div className="lg:col-span-2 space-y-5">
          {/* Card 1: Primary Identity & Metadata */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Product Identity & Specification
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Core product naming, barcode SKU, and categorization
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      SKU Code
                    </Label>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      (Read-Only Identifier)
                    </span>
                  </div>
                  <Input
                    value={sku}
                    disabled
                    readOnly
                    tabIndex={-1}
                    className="h-9 text-xs font-mono font-bold rounded-xl bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Unit of Measure <span className="text-red-500">*</span>
                  </Label>
                  <Select value={unit || "pcs"} onValueChange={setUnit}>
                    <SelectTrigger className="w-full h-9 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800">
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
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Product Full Title / Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter product title..."
                  className="h-9 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Product Category</Label>
                  <Select
                    value={categoryId ?? "__none__"}
                    onValueChange={(v) => setCategoryId(v === "__none__" ? undefined : v)}
                  >
                    <SelectTrigger className="w-full h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No category assigned</SelectItem>
                      {categories.map((c: any) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Primary Vendor / Supplier</Label>
                  <Select
                    value={primarySupplierId ?? "__none__"}
                    onValueChange={(v) => setPrimarySupplierId(v === "__none__" ? undefined : v)}
                  >
                    <SelectTrigger className="w-full h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Select supplier..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No supplier assigned</SelectItem>
                      {suppliers.map((s: any) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Product Description & Specs</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter detailed description, ingredients, storage rules..."
                  className="min-h-24 text-xs rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Financial Pricing Strategy */}
          {canViewFinancials && (
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUpIcon className="w-4 h-4 text-emerald-500" />
                  Financial Pricing Strategy & Margins
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Manage unit cost price basis and retail selling price
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Cost Price Basis (LKR)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={costPrice}
                      onChange={(e) => setCostPrice(Number(e.target.value))}
                      className="h-9 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Retail Selling Price (LKR)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(Number(e.target.value))}
                      className="h-9 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>

                {/* Margin Preview Banner */}
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Projected Gross Margin</p>
                    <p className="text-[11px] text-slate-500">Net Profit: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(netProfit)}</strong> per unit</p>
                  </div>
                  <Badge className="text-sm font-extrabold px-3 py-1 bg-emerald-500 text-white rounded-xl shadow-xs border-0">
                    {profitMargin}% Margin
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card 3: Inventory Thresholds & Safety Limits */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2Icon className="w-4 h-4 text-amber-500" />
                Inventory Replenishment & Safety Rules
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Define automated reorder points and critical safety stock triggers
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Reorder Trigger Level ({unit || "units"})
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={reorderPoint}
                    onChange={(e) => setReorderPoint(Number(e.target.value))}
                    className="h-9 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800"
                  />
                  <p className="text-[11px] text-slate-500">
                    System triggers replenishment suggestion when stock falls below this level.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Safety Stock Buffer ({unit || "units"})
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={safetyStock}
                    onChange={(e) => setSafetyStock(Number(e.target.value))}
                    className="h-9 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800"
                  />
                  <p className="text-[11px] text-slate-500">
                    Critical stock alert fires immediately when inventory falls below this minimum buffer.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar — Summary & Danger Zone */}
        <div className="space-y-5">
          {/* Card: Live SKU Summary Preview */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PackageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Live SKU Record Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <PackageIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {name || "Untitled Product"}
                  </p>
                  <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    SKU: {sku || "UNASSIGNED"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/50">
                  <span className="text-slate-500 font-medium">Unit Basis</span>
                  <span className="font-bold text-slate-900 dark:text-white">{unit || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/50">
                  <span className="text-slate-500 font-medium">Cost Basis</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(costPrice)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/50">
                  <span className="text-slate-500 font-medium">Selling Price</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(sellingPrice)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Reorder Trigger</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{reorderPoint} {unit}</span>
                </div>
              </div>

              <Button
                onClick={() => setSaveOpen(true)}
                disabled={!canEdit || saving}
                className="w-full h-10 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 border-0 shadow-md transition-all mt-2"
              >
                {saving ? "Saving Product..." : "Save Product Changes"}
              </Button>
            </CardContent>
          </Card>

          {/* Card: Danger Zone */}
          {canEdit && (
            <Card className="bg-red-500/5 border border-red-500/20 rounded-xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangleIcon className="w-4 h-4" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Permanently purge this product SKU and all historical movement records from the database.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Button
                  variant="destructive"
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="w-full h-9 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white border-0 shadow-xs"
                >
                  <Trash2Icon className="w-3.5 h-3.5 mr-1.5" /> Delete Product SKU
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Save Confirmation Dialog */}
      <AlertDialog open={saveOpen} onOpenChange={setSaveOpen}>
        <AlertDialogContent className="rounded-xl border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Save Product SKU Changes?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              This will update product naming, category mapping, pricing strategy, and reorder threshold levels across the entire system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving} className="rounded-xl text-xs font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSave}
              disabled={saving || !canEdit}
              className="rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 border-0"
            >
              {saving ? "Saving Changes..." : "Save Product Changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-xl border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-red-600 dark:text-red-400">
              Delete Product SKU Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              This action cannot be undone. It will permanently remove <strong>{name}</strong> ({sku}) and all linked inventory movement records from your system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving} className="rounded-xl text-xs font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 border-0"
            >
              Delete Product SKU
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
