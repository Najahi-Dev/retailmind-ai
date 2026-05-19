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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function EditProductClient({ productId, role }: { productId: string; role: string }) {
  const router = useRouter();
  const detail = useQuery(api.inventory.getProductDetail, { productId: productId as Id<"products"> });
  const categoriesQ = useQuery(api.inventory.getCategories);
  const suppliersQ = useQuery(api.inventory.getSuppliers);
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
      await edit({
        productId: productId as Id<"products">,
        sku,
        name,
        description,
        unit,
        categoryId: categoryId ? (categoryId as any) : undefined,
        primarySupplierId: primarySupplierId ? (primarySupplierId as any) : undefined,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        reorderPoint: Number(reorderPoint),
        safetyStock: Number(safetyStock),
      });
      toast.success("Product updated");
      router.push(`/inventory/${productId}`);
    } catch (err) {
      toast.error((err as Error)?.message ?? "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await del({ productId: productId as Id<"products"> });
      toast.success("Product deleted");
      router.push(`/inventory`);
    } catch (err) {
      toast.error((err as Error)?.message ?? "Delete failed");
    }
  };

  if (!detail) return <div>Loading…</div>;
  if (!detail.product) return <div>Product not found</div>;

  const canEdit = ["admin", "manager"].includes(role);
  const categories = categoriesQ ?? [];
  const suppliers = suppliersQ ?? [];

  return (
    <div className="p-4 lg:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Product</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>SKU</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
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
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cost Price</Label>
                <Input type="number" value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Selling Price</Label>
                <Input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} />
              </div>
            </div>

            <div className="flex justify-between">
              <div>
                <Button variant="destructive" type="button" onClick={() => setDeleteOpen(true)}>Delete Product</Button>
              </div>
              <div>
                <Button type="button" onClick={() => setSaveOpen(true)} disabled={!canEdit || saving}>{saving ? "Saving…" : "Save"}</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={saveOpen} onOpenChange={setSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save product changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the product details immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave} disabled={saving || !canEdit}>
              {saving ? "Saving…" : "Save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the product and its inventory/movement history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving}>
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
