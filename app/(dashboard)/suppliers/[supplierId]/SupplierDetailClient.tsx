// app/(dashboard)/suppliers/[supplierId]/SupplierDetailClient.tsx
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
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
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  Building2Icon,
  ClockIcon,
  AlertCircleIcon,
  XCircleIcon,
  PackageCheckIcon,
  CheckSquareIcon,
  ChevronRightIcon,
} from "lucide-react";

const PO_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string; icon: any }> = {
  draft: { label: "Draft", bg: "bg-slate-100 dark:bg-slate-800", color: "text-slate-600 dark:text-slate-300", border: "border-slate-300 dark:border-slate-700", icon: PackageIcon },
  sent: { label: "Sent", bg: "bg-blue-500/10", color: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20", icon: ClockIcon },
  confirmed: { label: "Confirmed", bg: "bg-amber-500/10", color: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20", icon: CheckSquareIcon },
  shipped: { label: "Shipped", bg: "bg-purple-500/10", color: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20", icon: TruckIcon },
  delivered: { label: "Delivered", bg: "bg-emerald-500/10", color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20", icon: PackageCheckIcon },
  cancelled: { label: "Cancelled", bg: "bg-red-500/10", color: "text-red-600 dark:text-red-400", border: "border-red-500/20", icon: XCircleIcon },
};

const SUPPLIER_STATUS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  active: { label: "Active", bg: "bg-emerald-500/10", color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  inactive: { label: "Inactive", bg: "bg-slate-100 dark:bg-slate-800", color: "text-slate-600 dark:text-slate-400", border: "border-slate-300 dark:border-slate-700" },
  on_hold: { label: "On Hold", bg: "bg-amber-500/10", color: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
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
  const { token } = useAuth();
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
    token: token ?? undefined,
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

  const isValidStatus = (val: string): val is SupplierStatus =>
    ["active", "inactive", "on_hold"].includes(val);

  const editFields: Array<{
    key: keyof EditForm;
    label: string;
    type: React.HTMLInputTypeAttribute;
  }> = [
    { key: "name", label: "Company Name", type: "text" },
    { key: "email", label: "Email Address", type: "email" },
    { key: "phone", label: "Phone Number", type: "text" },
    { key: "address", label: "Office Address", type: "text" },
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
        token: token ?? undefined,
        supplierId: supplierId as Id<"suppliers">,
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone || undefined,
        address: editForm.address || undefined,
        paymentTerms: editForm.paymentTerms || undefined,
        leadTimeDays: Number(editForm.leadTimeDays),
        status: editForm.status as SupplierStatus,
      });

      toast.success("Supplier updated successfully");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!detail) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-12 text-slate-500 font-semibold text-xs">
        <RefreshCwIcon className="animate-spin size-4 text-indigo-500" />
        Loading vendor profile specifications...
      </div>
    );
  }

  if (!detail.supplier) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-slate-500">
        <TruckIcon className="size-10 text-indigo-500/40" />
        <p className="font-bold text-slate-900 dark:text-white">Supplier Partner Not Found</p>
        <Button variant="outline" onClick={() => router.back()} className="rounded-xl text-xs font-semibold">
          Return to Suppliers
        </Button>
      </div>
    );
  }

  const { supplier, stats, recentPOs, products } = detail;
  const statusCfg = SUPPLIER_STATUS[supplier.status] ?? SUPPLIER_STATUS.active;

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full">
      {/* ── 1. HERO HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 text-white p-6 rounded-xl shadow-xl border shadow-lg relative overflow-hidden">
        {/* Glow Ambient Effect */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0 size-10 rounded-lg bg-white/10 hover:bg-white/20 border-white/20 text-white"
            >
              <ChevronLeftIcon className="w-5 h-5 text-indigo-200" />
            </Button>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {supplier.name}
                </h1>
                <Badge className={`text-xs font-bold px-2.5 py-0.5 border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                  {statusCfg.label}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {supplier.email} • <strong className="text-white font-mono">{supplier.leadTimeDays}d</strong> lead time
              </p>
            </div>
          </div>

          {!editing ? (
            <Button
              size="sm"
              onClick={startEdit}
              className="h-9 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 shadow-md border-0 shrink-0"
            >
              <PencilIcon className="size-3.5 mr-1.5" /> Edit Supplier
            </Button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="h-9 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 shadow-md border-0"
              >
                {saving ? (
                  <RefreshCwIcon className="animate-spin size-3.5 mr-1.5" />
                ) : (
                  <SaveIcon className="size-3.5 mr-1.5" />
                )}
                Save Changes
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(false)}
                className="h-9 rounded-xl text-xs font-semibold text-indigo-200 bg-white/10 hover:bg-white/20 border-white/20 px-3"
              >
                <XIcon className="size-3.5 mr-1" /> Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. TOP KPI METRICS GRID ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Orders</p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums mt-2">
            {stats.totalOrders}
          </p>          <p className="text-[11px] text-slate-500 font-medium mt-1">Issued Purchase Orders</p>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Orders</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 tabular-nums mt-2">
            {stats.pendingOrders}
          </p>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1">In Fulfillment Pipeline</p>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Supplied Products</p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums mt-2">
            {stats.totalProducts}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Catalog SKU Variants</p>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">On-Time Rate</p>
          <p className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums mt-2">
            {stats.onTimeRate !== null ? `${stats.onTimeRate}%` : "—"}
          </p>
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">Delivery Fulfillment Metric</p>
        </Card>
      </div>

      {/* ── 3. TABS CONTAINER ── */}
      <Tabs defaultValue="overview" className="w-full space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg h-11 border border-slate-200/80 dark:border-slate-800">
          <TabsTrigger value="overview" className="rounded-xl text-xs font-bold px-4 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-xs">
            Overview Specification
          </TabsTrigger>
          <TabsTrigger value="purchase-orders" className="rounded-xl text-xs font-bold px-4 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-xs">
            Purchase Orders ({recentPOs.length})
          </TabsTrigger>
          <TabsTrigger value="products" className="rounded-xl text-xs font-bold px-4 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-xs">
            Supplied Products ({products.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Overview ── */}
        <TabsContent value="overview" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Contact / Edit Card */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  {editing ? "Edit Supplier Specifications" : "Contact Information"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {editing ? (
                  <div className="space-y-3">
                    {editFields.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {field.label}
                        </Label>
                        <Input
                          type={field.type}
                          value={editForm[field.key] ?? ""}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              [field.key]: e.target.value,
                            }))
                          }
                          className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    ))}

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Payment Terms
                      </Label>
                      <Select
                        value={editForm.paymentTerms ?? "Net 30"}
                        onValueChange={(val) =>
                          setEditForm((f) => ({
                            ...f,
                            paymentTerms: val,
                          }))
                        }
                      >
                        <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_TERMS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Status</Label>
                      <Select
                        value={editForm.status ?? "active"}
                        onValueChange={(val) =>
                          setEditForm((f): EditForm => ({
                            ...f,
                            status: val as SupplierStatus,
                          }))
                        }
                      >
                        <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  [
                    { label: "Company Name", value: supplier.name, isBold: true },
                    { label: "Email Address", value: supplier.email, isBold: false },
                    { label: "Phone Number", value: supplier.phone ?? "—", isBold: false },
                    { label: "Office Address", value: supplier.address ?? "—", isBold: false },
                    {
                      label: "Payment Terms",
                      value: supplier.paymentTerms ?? "—",
                      isBold: true,
                    },
                    {
                      label: "Lead Time",
                      value: `${supplier.leadTimeDays} days`,
                      isBold: true,
                    },
                    { label: "Status", value: statusCfg.label, isBadge: true },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0 text-xs"
                    >
                      <span className="text-slate-500 font-medium shrink-0">
                        {row.label}
                      </span>
                      {row.isBadge ? (
                        <Badge className={`text-xs font-bold px-2 py-0.5 border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                          {statusCfg.label}
                        </Badge>
                      ) : (
                        <span className={`text-right ${row.isBold ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-slate-300"}`}>
                          {row.value}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Performance Summary Card */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                  Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5">
                {[
                  { label: "Total Orders", value: stats.totalOrders },
                  { label: "Delivered Orders", value: stats.deliveredOrders },
                  { label: "Pending Pipeline", value: stats.pendingOrders },
                  {
                    label: "Total Procurement Spend",
                    value: formatCurrency(stats.totalValue),
                    isBold: true,
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
                    className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0 text-xs"
                  >
                    <span className="text-slate-500 font-medium">{row.label}</span>
                    <span className={`text-right ${row.isBold ? "font-extrabold text-indigo-600 dark:text-indigo-400" : "font-bold text-slate-900 dark:text-white"}`}>
                      {row.value}
                    </span>
                  </div>
                ))}

                {/* On-time rate progress bar */}
                {stats.onTimeRate !== null && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500">On-Time Fulfillment Rate</span>
                      <span
                        className={`${
                          stats.onTimeRate >= 80
                            ? "text-emerald-600 dark:text-emerald-400"
                            : stats.onTimeRate >= 60
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {stats.onTimeRate}%
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          stats.onTimeRate >= 80
                            ? "bg-emerald-500"
                            : stats.onTimeRate >= 60
                              ? "bg-amber-500"
                              : "bg-red-500"
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

        {/* ── Tab 2: Purchase Orders ── */}
        <TabsContent value="purchase-orders" className="mt-0">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCartIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Vendor Purchase Orders Log
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Displaying last {recentPOs.length} purchase orders associated with this supplier
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {recentPOs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500 text-center">
                  <ShoppingCartIcon className="size-8 text-indigo-500/40" />
                  <p className="font-bold text-slate-900 dark:text-white">No Purchase Orders Found</p>
                  <p className="text-xs text-slate-500">No purchase order records exist for this supplier</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200">
                      <tr>
                        <th className="px-5 py-3.5 font-bold">PO Number</th>
                        <th className="px-5 py-3.5 font-bold hidden sm:table-cell">Items</th>
                        <th className="px-5 py-3.5 font-bold">Status</th>
                        <th className="px-5 py-3.5 font-bold text-right hidden md:table-cell">Total Value</th>
                        <th className="px-5 py-3.5 font-bold hidden lg:table-cell">Date</th>
                        <th className="px-3 py-3.5 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {recentPOs.map((po) => {
                        const poCfg = PO_STATUS_CONFIG[po.status] ?? PO_STATUS_CONFIG.draft;
                        const StatusIcon = poCfg.icon;

                        return (
                          <tr
                            key={po._id}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                            onClick={() => router.push(`/reorders/purchase-orders/${po._id}`)}
                          >
                            <td className="px-5 py-3.5">
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                {po.poNumber}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-400 font-medium hidden sm:table-cell">
                              {po.lineItems.length} item{po.lineItems.length !== 1 ? "s" : ""}
                            </td>
                            <td className="px-5 py-3.5">
                              <Badge className={`text-xs font-bold px-2.5 py-0.5 inline-flex items-center gap-1 border ${poCfg.bg} ${poCfg.color} ${poCfg.border}`}>
                                {StatusIcon && <StatusIcon className="w-3 h-3" />}
                                <span>{poCfg.label}</span>
                              </Badge>
                            </td>
                            <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-white tabular-nums hidden md:table-cell text-sm">
                              {formatCurrency(po.totalValue)}
                            </td>
                            <td className="px-5 py-3.5 text-xs text-slate-500 font-medium hidden lg:table-cell">
                              {formatDate(po.createdAt)}
                            </td>
                            <td className="px-3 py-3.5 text-right">
                              <ChevronRightIcon className="w-4 h-4 text-slate-400" />
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

        {/* ── Tab 3: Products ── */}
        <TabsContent value="products" className="mt-0">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PackageIcon className="w-4 h-4 text-emerald-500" />
                Supplied Inventory Products
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Displaying {products.length} products fulfilled by this supplier
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500 text-center">
                  <PackageIcon className="size-8 text-indigo-500/40" />
                  <p className="font-bold text-slate-900 dark:text-white">No Products Assigned</p>
                  <p className="text-xs text-slate-500">No inventory products are currently mapped to this supplier</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200">
                      <tr>
                        <th className="px-5 py-3.5 font-bold">Product Title & SKU</th>
                        <th className="px-5 py-3.5 font-bold hidden sm:table-cell">Category</th>
                        <th className="px-5 py-3.5 font-bold text-right">On Hand</th>
                        <th className="px-5 py-3.5 font-bold text-right hidden md:table-cell">Reorder Point</th>
                        <th className="px-3 py-3.5 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {products.map((p) => (
                        <tr
                          key={p._id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                          onClick={() => router.push(`/inventory/${p._id}`)}
                        >
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                              SKU: {p.sku}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-400 font-semibold hidden sm:table-cell">
                            {p.categoryName}
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                            {p.onHand}
                          </td>
                          <td className="px-5 py-3.5 text-right text-slate-500 font-medium hidden md:table-cell tabular-nums text-xs">
                            {p.reorderPoint}
                          </td>
                          <td className="px-3 py-3.5 text-right">
                            <ChevronRightIcon className="w-4 h-4 text-slate-400" />
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
