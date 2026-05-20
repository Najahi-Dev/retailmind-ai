// app/(dashboard)/suppliers/[supplierId]/SupplierDetailClient.tsx
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ChevronLeftIcon,
  RefreshCwIcon,
  TruckIcon,
  PackageIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  PencilIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", color: "bg-blue-500/10 text-blue-500" },
  confirmed: { label: "Confirmed", color: "bg-yellow-500/10 text-yellow-500" },
  shipped: { label: "Shipped", color: "bg-purple-500/10 text-purple-500" },
  delivered: { label: "Delivered", color: "bg-green-500/10 text-green-500" },
  cancelled: {
    label: "Cancelled",
    color: "bg-destructive/10 text-destructive",
  },
};

const SUPPLIER_STATUS = {
  active: { label: "Active", color: "text-green-500 border-green-200" },
  inactive: { label: "Inactive", color: "" },
  on_hold: { label: "On Hold", color: "text-yellow-500 border-yellow-200" },
};

const PAYMENT_TERMS = ["Net 30", "Net 15", "Net 60", "COD", "Prepaid"];

type SupplierStatus = "active" | "inactive" | "on_hold";

type EditForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms: string;
  leadTimeDays: string;
  status: SupplierStatus;
};

export default function SupplierDetailClient({
  supplierId,
}: {
  supplierId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    email: "",
    phone: "",
    address: "",
    paymentTerms: "Net 30",
    leadTimeDays: "7",
    status: "active",
  });

  const detail = useQuery(api.suppliers.getSupplierDetail, {
    supplierId: supplierId as Id<"suppliers">,
  });
  const updateSupplier = useMutation(api.suppliers.updateSupplier);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(val);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const startEdit = () => {
    if (!detail?.supplier) return;
    const s = detail.supplier;
    setEditForm({
      name: s.name,
      email: s.email,
      phone: s.phone ?? "",
      address: s.address ?? "",
      paymentTerms: s.paymentTerms ?? "Net 30",
      leadTimeDays: String(s.leadTimeDays),
      status: s.status,
    });
    setEditing(true);
  };

  // Validate pannuvom before calling
  const isValidStatus = (val: string): val is SupplierStatus =>
    ["active", "inactive", "on_hold"].includes(val);

  const editFields: Array<{
    key: keyof EditForm;
    label: string;
    type: React.HTMLInputTypeAttribute;
  }> = [
    { key: "name", label: "Company Name", type: "text" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "address", label: "Address", type: "text" },
    { key: "leadTimeDays", label: "Lead Time (days)", type: "number" },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!isValidStatus(editForm.status ?? "")) {
        toast.error("Invalid status value");
        return;
      }

      await updateSupplier({
        supplierId: supplierId as Id<"suppliers">,
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone || undefined,
        address: editForm.address || undefined,
        paymentTerms: editForm.paymentTerms || undefined,
        leadTimeDays: Number(editForm.leadTimeDays),
        status: editForm.status as SupplierStatus, // ← typed, not any
      });

      toast.success("Supplier updated");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!detail) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-6 text-muted-foreground">
        <RefreshCwIcon className="animate-spin size-4" />
        Loading...
      </div>
    );
  }

  if (!detail.supplier) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <TruckIcon className="size-12 text-muted-foreground/40" />
        <p className="font-medium">Supplier not found</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const { supplier, stats, recentPOs, products } = detail;
  const statusCfg =
    SUPPLIER_STATUS[supplier.status as keyof typeof SUPPLIER_STATUS];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 @container/main">
      {/* ── Header ────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ChevronLeftIcon className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold font-[Montserrat] tracking-tight">
                {supplier.name}
              </h2>
              <Badge variant="outline" className={statusCfg.color}>
                {statusCfg.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {supplier.email} · {supplier.leadTimeDays}d lead time
            </p>
          </div>
        </div>

        {!editing ? (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <PencilIcon className="size-4 mr-2" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <RefreshCwIcon className="animate-spin size-4 mr-2" />
              ) : (
                <SaveIcon className="size-4 mr-2" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(false)}
            >
              <XIcon className="size-4 mr-1" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* ── Stats ─────────────────────────────── */}
      <div
        className="grid grid-cols-2 gap-4
        *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5
        *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs
        @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card"
      >
        {[
          { label: "Total Orders", value: stats.totalOrders, suffix: "" },
          { label: "Pending Orders", value: stats.pendingOrders, suffix: "" },
          { label: "Products", value: stats.totalProducts, suffix: "" },
          {
            label: "On-Time Rate",
            value: stats.onTimeRate !== null ? `${stats.onTimeRate}%` : "—",
            suffix: "",
          },
        ].map((s) => (
          <Card key={s.label} className="@container/card">
            <CardHeader>
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-2xl font-bold tabular-nums">
                {s.value}
                {s.suffix}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* ── Tabs ──────────────────────────────── */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="purchase-orders">
            Purchase Orders
            {stats.pendingOrders > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                {stats.pendingOrders}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="products">
            Products
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
              {stats.totalProducts}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Overview ───────────────── */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 @xl/main:grid-cols-2">
            {/* Contact info / edit form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {editing ? "Edit Supplier" : "Contact Information"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {editing ? (
                  // ── Edit form ──────────────────
                  <div className="space-y-3">
                    {editFields.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <label className="text-sm font-medium">
                          {field.label}
                        </label>
                        <Input
                          type={field.type}
                          value={editForm[field.key] ?? ""}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              [field.key]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}

                    <div className="space-y-1">
                      <label className="text-sm font-medium">
                        Payment Terms
                      </label>
                      <select
                        value={editForm.paymentTerms ?? "Net 30"}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            paymentTerms: e.target.value,
                          }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {PAYMENT_TERMS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">Status</label>
                      <select
                        value={editForm.status ?? "active"}
                        onChange={(e) =>
                          setEditForm((f): EditForm => ({
                            ...f,
                            status: e.target.value as SupplierStatus,
                          }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="active">Active</option>
                        <option value="on_hold">On Hold</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  // ── Read view ──────────────────
                  [
                    { label: "Company Name", value: supplier.name },
                    { label: "Email", value: supplier.email },
                    { label: "Phone", value: supplier.phone ?? "—" },
                    { label: "Address", value: supplier.address ?? "—" },
                    {
                      label: "Payment Terms",
                      value: supplier.paymentTerms ?? "—",
                    },
                    {
                      label: "Lead Time",
                      value: `${supplier.leadTimeDays} days`,
                    },
                    { label: "Status", value: statusCfg.label },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-start justify-between gap-4 py-1.5 border-b border-border/50 last:border-0 text-sm"
                    >
                      <span className="text-muted-foreground shrink-0 w-32">
                        {row.label}
                      </span>
                      <span className="font-medium text-right">
                        {row.value}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Performance summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Total Orders", value: stats.totalOrders },
                  { label: "Delivered", value: stats.deliveredOrders },
                  { label: "Pending", value: stats.pendingOrders },
                  {
                    label: "Total Spend",
                    value: formatCurrency(stats.totalValue),
                  },
                  {
                    label: "Reliability Score",
                    value: supplier.reliabilityScore
                      ? `${supplier.reliabilityScore}%`
                      : "—",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 text-sm"
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold">{row.value}</span>
                  </div>
                ))}

                {/* On-time rate bar */}
                {stats.onTimeRate !== null && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>On-Time Rate</span>
                      <span
                        className={`font-semibold ${
                          stats.onTimeRate >= 80
                            ? "text-green-500"
                            : stats.onTimeRate >= 60
                              ? "text-yellow-500"
                              : "text-destructive"
                        }`}
                      >
                        {stats.onTimeRate}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          stats.onTimeRate >= 80
                            ? "bg-green-500"
                            : stats.onTimeRate >= 60
                              ? "bg-yellow-500"
                              : "bg-destructive"
                        }`}
                        style={{ width: `${stats.onTimeRate}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab 2: Purchase Orders ──────────── */}
        <TabsContent value="purchase-orders" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCartIcon className="size-4 text-muted-foreground" />
                Recent Purchase Orders
              </CardTitle>
              <CardDescription>Last {recentPOs.length} orders</CardDescription>
            </CardHeader>
            <CardContent>
              {recentPOs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <ShoppingCartIcon className="size-8 opacity-40" />
                  <p>No purchase orders yet</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                          PO Number
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                          Items
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                          Value
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPOs.map((po) => {
                        const cfg = STATUS_CONFIG[po.status];
                        return (
                          <tr
                            key={po._id}
                            className="border-t hover:bg-muted/50 cursor-pointer"
                            onClick={() =>
                              router.push(`/reorders/purchase-orders/${po._id}`)
                            }
                          >
                            <td className="px-4 py-3 font-mono text-xs font-medium">
                              {po.poNumber}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-sm hidden sm:table-cell">
                              {po.lineItems.length} item
                              {po.lineItems.length !== 1 ? "s" : ""}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
                              >
                                {po.status === "delivered" && (
                                  <CheckCircleIcon className="size-3" />
                                )}
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium hidden md:table-cell">
                              {formatCurrency(po.totalValue)}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                              {formatDate(po.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Products ─────────────────── */}
        <TabsContent value="products" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PackageIcon className="size-4 text-muted-foreground" />
                Supplied Products
              </CardTitle>
              <CardDescription>
                {stats.totalProducts} products from this supplier
              </CardDescription>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <PackageIcon className="size-8 opacity-40" />
                  <p>No products assigned to this supplier</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                          Product
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">
                          Category
                        </th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                          On Hand
                        </th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                          Reorder Pt.
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr
                          key={p._id}
                          className="border-t hover:bg-muted/50 cursor-pointer"
                          onClick={() => router.push(`/inventory/${p._id}`)}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {p.sku}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                            {p.categoryName}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {p.onHand}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                            {p.reorderPoint}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
