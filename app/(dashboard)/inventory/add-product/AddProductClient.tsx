"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  const [reorderPoint, setReorderPoint] = useState(0);
  const [safetyStock, setSafetyStock] = useState(0);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [primarySupplierId, setPrimarySupplierId] = useState<string | undefined>(undefined);
  const [trackBatches, setTrackBatches] = useState(false);
  const [initialLocationId, setInitialLocationId] = useState<string | undefined>(undefined);
  const [initialQuantity, setInitialQuantity] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const locations = locationsQ?.locations ?? [];
  const categories = categoriesQ ?? [];
  const suppliers = suppliersQ ?? [];

  useEffect(() => {
    if (!sku && nextSku) setSku(nextSku);
  }, [nextSku]);

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

      toast.success("Product created");
      setConfirmOpen(false);
      router.push(`/inventory/${id}`);
    } catch (err) {
      toast.error((err as Error)?.message ?? "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  return (
    <div className="p-4 lg:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Product</CardTitle>
          <CardDescription>Create a new product and optionally seed initial stock.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>SKU</Label>
                <Input value={sku} onChange={(e) => setSku(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={unit} onValueChange={(v) => setUnit(v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Unit" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">pcs</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="litre">litre</SelectItem>
                    <SelectItem value="box">box</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={categoryId ?? "__none__"} onValueChange={(v) => setCategoryId(v === "__none__" ? undefined : v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Choose category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No category</SelectItem>
                    {categories.map((category: any) => (
                      <SelectItem key={category._id} value={category._id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select value={primarySupplierId ?? "__none__"} onValueChange={(v) => setPrimarySupplierId(v === "__none__" ? undefined : v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Choose supplier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No supplier</SelectItem>
                    {suppliers.map((supplier: any) => (
                      <SelectItem key={supplier._id} value={supplier._id}>{supplier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cost Price</Label>
                <Input type="number" value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Selling Price</Label>
                <Input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Reorder Point</Label>
                <Input type="number" value={reorderPoint} onChange={(e) => setReorderPoint(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Safety Stock</Label>
                <Input type="number" value={safetyStock} onChange={(e) => setSafetyStock(Number(e.target.value))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Initial location (optional)</Label>
                <Select value={initialLocationId} onValueChange={(v) => setInitialLocationId(v || undefined)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Choose location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l: any) => (
                      <SelectItem key={l._id} value={l._id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Initial quantity (optional)</Label>
                <Input type="number" value={initialQuantity ?? ""} onChange={(e) => setInitialQuantity(e.target.value ? Number(e.target.value) : undefined)} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create Product"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will add the product to inventory and optionally seed the initial stock location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreate} disabled={saving}>
              {saving ? "Creating…" : "Create Product"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
