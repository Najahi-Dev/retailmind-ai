// app/(dashboard)/reorders/purchase-orders/create/CreatePOClient.tsx
"use client";
import { useQuery, useMutation } from "convex/react";
import { api }       from "@/convex/_generated/api";
import { Id }        from "@/convex/_generated/dataModel";
import { useState }  from "react";
import { useRouter } from "next/navigation";
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Badge }   from "@/components/ui/badge";
import { toast }   from "sonner";
import {
  ChevronLeftIcon, PlusIcon, Trash2Icon,
  RefreshCwIcon, ShoppingCartIcon,
} from "lucide-react";

interface LineItem {
  productId:       string;
  productName:     string;
  productSku:      string;
  unit:            string;
  quantityOrdered: number;
  unitCost:        number;
}

export default function CreatePOClient() {
  const router = useRouter();

  // ── Data ──────────────────────────────────
  const suppliers = useQuery(api.suppliers.getActiveSuppliers);
  const products  = useQuery(api.inventory.getStockOutFormData);
  const createPO  = useMutation(api.purchaseOrders.createPurchaseOrder);

  // ── Form state ────────────────────────────
  const [supplierId,  setSupplierId]  = useState("");
  const [lineItems,   setLineItems]   = useState<LineItem[]>([]);
  const [notes,       setNotes]       = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  // ── Add line item state ───────────────────
  const [addProductId, setAddProductId] = useState("");
  const [addQty,       setAddQty]       = useState("");
  const [addCost,      setAddCost]      = useState("");

  const totalValue = lineItems.reduce(
    (sum, item) => sum + item.quantityOrdered * item.unitCost, 0
  );

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency", currency: "LKR", maximumFractionDigits: 0,
    }).format(val);

  const selectClass = `
    flex h-10 w-full rounded-md border border-input
    bg-background px-3 py-2 text-sm text-foreground
    shadow-sm transition-colors cursor-pointer
    focus-visible:outline-none focus-visible:ring-1
    focus-visible:ring-ring appearance-none
  `;

  // ── Add line item ─────────────────────────
  const handleAddLine = () => {
    if (!addProductId || !addQty || !addCost) return;

    const product = products?.products.find(
      (p) => p !== null && p._id === addProductId,
    );
    if (!product) return;

    const existing = lineItems.findIndex((l) => l.productId === addProductId);

    if (existing >= 0) {
      const updated = [...lineItems];
      updated[existing] = {
        ...updated[existing],
        quantityOrdered: updated[existing].quantityOrdered + Number(addQty),
      };
      setLineItems(updated);
    } else {
      setLineItems((prev) => [
        ...prev,
        {
          productId: addProductId,
          productName: product.name,
          productSku: product.sku,
          unit: product.unit,
          quantityOrdered: Number(addQty),
          unitCost: Number(addCost),
        },
      ]);
    }

    setAddProductId("");
    setAddQty("");
    setAddCost("");
  };

  // ── Remove line item ──────────────────────
  const handleRemoveLine = (productId: string) => {
    setLineItems(lineItems.filter(l => l.productId !== productId));
  };

  // ── Submit ────────────────────────────────
  const handleSubmit = async () => {
    if (!supplierId || lineItems.length === 0) return;
    setSubmitting(true);

    try {
      const result = await createPO({
        supplierId: supplierId as Id<"suppliers">,
        lineItems:  lineItems.map(l => ({
          productId:       l.productId       as Id<"products">,
          quantityOrdered: l.quantityOrdered,
          unitCost:        l.unitCost,
        })),
        notes: notes || undefined,
      });

      toast.success(`PO ${result.poNumber} created successfully!`);
      router.push("/reorders/purchase-orders");

    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : "Failed to create PO";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!suppliers || !products) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-6 text-muted-foreground">
        <RefreshCwIcon className="animate-spin size-4" />
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6 @container/main">
      {/* ── Header ────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ChevronLeftIcon className="size-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold font-[Montserrat] tracking-tight">
            Create Purchase Order
          </h2>
          <p className="text-sm text-muted-foreground">
            Manually create a new purchase order
          </p>
        </div>
      </div>

      <div className="grid gap-6 @xl/main:grid-cols-3">
        {/* ── Left — Form ───────────────── */}
        <div className="@xl/main:col-span-2 flex flex-col gap-4">
          {/* Supplier */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Supplier</CardTitle>
              <CardDescription>
                Select the supplier for this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className={selectClass}
                >
                  <option value="" disabled>
                    Select supplier...
                  </option>
                  {(suppliers ?? []).map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} — {s.leadTimeDays}d lead time
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <ChevronLeftIcon className="size-3.5 -rotate-90" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Line Items</CardTitle>
              <CardDescription>
                Add products to this purchase order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add product row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="sm:col-span-2 relative">
                  <select
                    value={addProductId}
                    onChange={(e) => {
                      setAddProductId(e.target.value);
                      // Auto fill cost price
                      const prod = products.products.find(
                        (p) => p._id === e.target.value,
                      );
                      if (prod) setAddCost(String(0)); // will be set by user
                    }}
                    className={selectClass}
                  >
                    <option value="" disabled>
                      Select product...
                    </option>
                    {products.products
                      .filter((p): p is NonNullable<typeof p> => p !== null)
                      .map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.sku} — {p.name}
                        </option>
                      ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <ChevronLeftIcon className="size-3.5 -rotate-90" />
                  </div>
                </div>

                <Input
                  type="number"
                  placeholder="Qty"
                  min={1}
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                />

                <Input
                  type="number"
                  placeholder="Unit cost (LKR)"
                  min={0}
                  value={addCost}
                  onChange={(e) => setAddCost(e.target.value)}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleAddLine}
                disabled={!addProductId || !addQty || !addCost}
                className="w-full"
              >
                <PlusIcon className="size-4 mr-2" />
                Add Product
              </Button>

              {/* Line items list */}
              {lineItems.length > 0 && (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                          Product
                        </th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                          Qty
                        </th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                          Unit Cost
                        </th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                          Total
                        </th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item) => (
                        <tr key={item.productId} className="border-t">
                          <td className="px-4 py-3">
                            <p className="font-medium text-sm">
                              {item.productName}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {item.productSku}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {item.quantityOrdered} {item.unit}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                            {formatCurrency(item.unitCost)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrency(
                              item.quantityOrdered * item.unitCost,
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveLine(item.productId)}
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Empty state */}
              {lineItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground border rounded-md border-dashed">
                  <ShoppingCartIcon className="size-8 opacity-40" />
                  <p className="text-sm">No products added yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Notes</CardTitle>
              <CardDescription>Optional notes for this order</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                rows={3}
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm resize-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </CardContent>
          </Card>
        </div>

        {/* ── Right — Summary ───────────── */}
        <div className="flex flex-col gap-4">
          <Card className="sticky top-20">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCartIcon className="size-4 text-muted-foreground" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary rows */}
              <div className="space-y-2">
                {[
                  {
                    label: "Supplier",
                    value:
                      suppliers.find((s) => s._id === supplierId)?.name ?? "—",
                  },
                  {
                    label: "Items",
                    value: `${lineItems.length} product${lineItems.length !== 1 ? "s" : ""}`,
                  },
                  {
                    label: "Total Qty",
                    value: lineItems
                      .reduce((s, i) => s + i.quantityOrdered, 0)
                      .toString(),
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0"
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Total value */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <span className="text-sm font-semibold">Total Value</span>
                <span className="text-lg font-bold">
                  {formatCurrency(totalValue)}
                </span>
              </div>

              {/* Status badge */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline">Draft</Badge>
              </div>

              {/* Validation warnings */}
              {!supplierId && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  ⚠ Select a supplier
                </p>
              )}
              {lineItems.length === 0 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  ⚠ Add at least one product
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!supplierId || lineItems.length === 0 || submitting}
                >
                  {submitting ? (
                    <>
                      <RefreshCwIcon className="animate-spin size-4 mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <ShoppingCartIcon className="size-4 mr-2" />
                      Create Purchase Order
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.back()}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}