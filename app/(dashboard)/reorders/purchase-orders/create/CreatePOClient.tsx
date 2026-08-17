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
import { Label }   from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge }   from "@/components/ui/badge";
import { toast }   from "sonner";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeftIcon, PlusIcon, Trash2Icon,
  RefreshCwIcon, ShoppingCartIcon, Building2Icon,
  PackageIcon, AlertCircleIcon,
  BanknoteIcon, HandshakeIcon, FileCheckIcon,
  CheckCircle2Icon, AlertTriangleIcon, InfoIcon, ClockIcon,
} from "lucide-react";

interface LineItem {
  productId:       string;
  productName:     string;
  productSku:      string;
  unit:            string;
  quantityOrdered: number;
  unitCost:        number;
}

import { useAuth } from "@/lib/auth-context";

type PaymentMethod = "CASH_ON_DELIVERY" | "CHEQUE" | "CREDIT" | "";

const BANK_OPTIONS = [
  "Commercial Bank",
  "Bank of Ceylon (BOC)",
  "Hatton National Bank (HNB)",
  "Sampath Bank",
  "People's Bank",
  "NSB (National Savings Bank)",
  "Seylan Bank",
  "DFCC Bank",
  "Union Bank",
  "Pan Asia Bank",
];

export default function CreatePOClient() {
  const router = useRouter();
  const { token } = useAuth();

  // ── Data ──────────────────────────────────
  const suppliers = useQuery(api.suppliers.getActiveSuppliers, { token: token ?? undefined });
  const products  = useQuery(api.inventory.getStockInFormData, { token: token ?? undefined });
  const createPO  = useMutation(api.purchaseOrders.createPurchaseOrder);

  // ── Form state ────────────────────────────
  const [supplierId,  setSupplierId]  = useState("");
  const [lineItems,   setLineItems]   = useState<LineItem[]>([]);
  const [notes,       setNotes]       = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  // ── Payment method state ──────────────────
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("");

  // Cheque fields
  const [chequeNumber,  setChequeNumber]  = useState("");
  const [bankName,      setBankName]      = useState("");
  const [chequeDate,    setChequeDate]    = useState("");
  const [chequeStatus,  setChequeStatus]  = useState<"ISSUED" | "CLEARED" | "BOUNCED">("ISSUED");

  // Credit fields
  const [creditTermDays, setCreditTermDays] = useState<number>(30);

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

  const isChequeValid = paymentMethod !== "CHEQUE" || (
    chequeNumber.trim() !== "" && bankName !== "" && chequeDate !== ""
  );

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
    if (!isChequeValid) {
      toast.error("Please fill in all required cheque details.");
      return;
    }
    setSubmitting(true);

    try {
      const computedDueDate = paymentMethod === "CREDIT"
        ? Date.now() + creditTermDays * 24 * 60 * 60 * 1000
        : undefined;

      const result = await createPO({
        token: token ?? undefined,
        supplierId: supplierId as Id<"suppliers">,
        lineItems:  lineItems.map(l => ({
          productId:       l.productId       as Id<"products">,
          quantityOrdered: l.quantityOrdered,
          unitCost:        l.unitCost,
        })),
        notes: notes || undefined,
        // Payment
        paymentMethod: paymentMethod || undefined,
        chequeNumber:  paymentMethod === "CHEQUE" ? chequeNumber : undefined,
        bankName:      paymentMethod === "CHEQUE" ? bankName : undefined,
        chequeAmount:  paymentMethod === "CHEQUE" ? totalValue : undefined,
        chequeDate:    paymentMethod === "CHEQUE" && chequeDate ? new Date(chequeDate).getTime() : undefined,
        chequeStatus:  paymentMethod === "CHEQUE" ? chequeStatus : undefined,
        creditTermDays: paymentMethod === "CREDIT" ? creditTermDays : undefined,
        dueDate:        computedDueDate,
      });

      toast.success(`Purchase Order ${result.poNumber} created successfully!`);
      router.push("/reorders/purchase-orders");

    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : "Failed to create Purchase Order";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!suppliers || !products) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-12 text-slate-500 font-semibold text-xs">
        <RefreshCwIcon className="animate-spin size-4 text-indigo-500" />
        Loading procurement form options...
      </div>
    );
  }

  const selectedSupplier = suppliers.find((s) => s._id === supplierId);

  const uniqueProducts = Array.from(
    new Map(
      (products.products ?? [])
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((p) => [p._id, p])
    ).values()
  );

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
                  Create Manual Purchase Order
                </h1>
                <Badge className="text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5">
                  Draft Mode
                </Badge>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Manually draft custom purchase order lines and assign primary vendor.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="h-9 rounded-xl text-xs font-semibold text-indigo-200 bg-white/10 hover:bg-white/20 border-white/20 px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!supplierId || lineItems.length === 0 || submitting}
              className="h-9 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-5 shadow-md border-0"
            >
              {submitting ? "Creating PO..." : "Issue Purchase Order"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. TWO COLUMN FORM GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column — Form Fields */}
        <div className="lg:col-span-2 space-y-5">
          {/* Card 1: Supplier Selector */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Primary Vendor / Supplier
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Select the target vendor supplier to issue this purchase order to
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="w-full h-10 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {(suppliers ?? []).map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      <div className="flex items-center justify-between gap-3 w-full">
                        <span className="font-bold text-xs">{s.name}</span>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {s.leadTimeDays}d lead time
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Card 2: Line Items Builder */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PackageIcon className="w-4 h-4 text-emerald-500" />
                Order Line Items
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Add SKU products, quantities, and cost basis to this order
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Product Add Row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <Select
                    value={addProductId}
                    onValueChange={(val) => {
                      setAddProductId(val);
                    }}
                  >
                    <SelectTrigger className="w-full h-9 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Select product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueProducts.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mr-2">[{p.sku}]</span>
                          <span>{p.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Input
                  type="number"
                  placeholder="Qty"
                  min={1}
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  className="h-9 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800"
                />

                <Input
                  type="number"
                  placeholder="Unit cost (LKR)"
                  min={0}
                  value={addCost}
                  onChange={(e) => setAddCost(e.target.value)}
                  className="h-9 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>

              <Button
                type="button"
                onClick={handleAddLine}
                disabled={!addProductId || !addQty || !addCost}
                className="w-full h-9 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-0 transition-colors"
              >
                <PlusIcon className="w-4 h-4 mr-1.5" /> Add Product to Order
              </Button>

              {/* Line Items Table */}
              {lineItems.length > 0 ? (
                <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-bold">Product SKU</th>
                        <th className="px-4 py-3 font-bold text-right">Qty</th>
                        <th className="px-4 py-3 font-bold text-right hidden sm:table-cell">Unit Cost</th>
                        <th className="px-4 py-3 font-bold text-right">Line Total</th>
                        <th className="px-3 py-3 w-10 text-center" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {lineItems.map((item) => (
                        <tr key={item.productId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900 dark:text-white">{item.productName}</p>
                            <p className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                              SKU: {item.productSku}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900 dark:text-white">
                            {item.quantityOrdered} {item.unit}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 font-medium hidden sm:table-cell tabular-nums">
                            {formatCurrency(item.unitCost)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                            {formatCurrency(item.quantityOrdered * item.unitCost)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10"
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
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-2.5 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  <ShoppingCartIcon className="size-8 text-indigo-500/40" />
                  <p className="text-xs font-semibold text-slate-500">No products added yet to this order</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Payment Method */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BanknoteIcon className="w-4 h-4 text-emerald-500" />
                Payment Method
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Select the payment method for this purchase order (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Payment Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: "CASH_ON_DELIVERY" as PaymentMethod, label: "Cash on Delivery",          icon: BanknoteIcon,  color: "emerald" },
                  { value: "CHEQUE"           as PaymentMethod, label: "Cheque Payment",             icon: FileCheckIcon, color: "amber"   },
                  { value: "CREDIT"           as PaymentMethod, label: "Credit / Accounts Payable",  icon: HandshakeIcon, color: "blue"    },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = paymentMethod === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPaymentMethod(isSelected ? "" : opt.value)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? `border-${opt.color}-500 bg-${opt.color}-50 dark:bg-${opt.color}-950/30`
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900"
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        isSelected ? `bg-${opt.color}-500 text-white` : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}>
                        <Icon className="size-4" />
                      </div>
                      <span className={`text-xs font-bold flex-1 ${
                        isSelected ? `text-${opt.color}-700 dark:text-${opt.color}-300` : "text-slate-700 dark:text-slate-300"
                      }`}>{opt.label}</span>
                      {isSelected && <CheckCircle2Icon className={`size-4 shrink-0 text-${opt.color}-500`} />}
                    </button>
                  );
                })}
              </div>

              {/* ── CHEQUE SUB-FORM ── */}
              {paymentMethod === "CHEQUE" && (
                <div className="rounded-xl border-2 border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-xs font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <FileCheckIcon className="size-3.5" /> Cheque Details
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Cheque Number */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Cheque Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="e.g. CHQ-893041"
                        value={chequeNumber}
                        onChange={e => setChequeNumber(e.target.value)}
                        className="h-8 text-xs rounded-lg border-amber-300/60 dark:border-amber-700/40 bg-white dark:bg-slate-900"
                      />
                    </div>

                    {/* Bank Name */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Bank Name <span className="text-red-500">*</span>
                      </Label>
                      <Select value={bankName} onValueChange={setBankName}>
                        <SelectTrigger className="h-8 text-xs rounded-lg border-amber-300/60 dark:border-amber-700/40 bg-white dark:bg-slate-900">
                          <SelectValue placeholder="Select bank..." />
                        </SelectTrigger>
                        <SelectContent>
                          {BANK_OPTIONS.map(b => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Cheque Amount */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Cheque Amount (LKR)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={totalValue || ""}
                        readOnly
                        className="h-8 text-xs rounded-lg border-amber-300/60 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-950/30 text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    {/* Cheque Date */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Cheque Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={chequeDate}
                        onChange={e => setChequeDate(e.target.value)}
                        className="h-8 text-xs rounded-lg border-amber-300/60 dark:border-amber-700/40 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  {/* Cheque Status */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Cheque Status</Label>
                    <div className="flex gap-2">
                      {(["ISSUED", "CLEARED", "BOUNCED"] as const).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setChequeStatus(s)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                            chequeStatus === s
                              ? s === "ISSUED"  ? "bg-amber-500 text-white border-amber-500"
                              : s === "CLEARED" ? "bg-emerald-500 text-white border-emerald-500"
                              :                   "bg-red-500 text-white border-red-500"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(!chequeNumber || !bankName || !chequeDate) && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1 font-medium">
                      <AlertTriangleIcon className="size-3" /> Cheque number, bank name, and date are required.
                    </p>
                  )}
                </div>
              )}

              {/* ── CREDIT INFO BADGE ── */}
              {paymentMethod === "CREDIT" && (
                <div className="rounded-xl border-2 border-blue-400/40 bg-blue-50/60 dark:bg-blue-950/20 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-start gap-2.5">
                    <InfoIcon className="size-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                      This order will be logged as an outstanding payable liability{" "}
                      <span className="font-extrabold text-blue-700 dark:text-blue-200">(DUE)</span> in Payment History.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <ClockIcon className="size-3 text-blue-500" /> Credit Term Days
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={creditTermDays}
                        onChange={e => setCreditTermDays(Number(e.target.value) || 30)}
                        className="h-8 w-24 text-xs rounded-lg border-blue-300/60 dark:border-blue-700/40 bg-white dark:bg-slate-900"
                      />
                      <span className="text-xs text-slate-500 font-medium">days</span>
                      <Badge className="ml-auto text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 px-2 py-0.5">
                        Due: {new Date(Date.now() + creditTermDays * 86400000).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 4: Notes */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Fulfillment Notes</CardTitle>
              <CardDescription className="text-xs text-slate-500">Optional instructions or delivery notes for the vendor</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                rows={3}
                placeholder="Any additional instructions or delivery notes for supplier..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-20 text-xs rounded-xl border-slate-200 dark:border-slate-800"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Summary Box */}
        <div className="space-y-5">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm sticky top-20">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCartIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Purchase Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 font-medium">Target Supplier</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedSupplier?.name ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 font-medium">Product Lines</span>
                  <span className="font-bold text-slate-900 dark:text-white">{lineItems.length} products</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 font-medium">Total Quantity</span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                    {lineItems.reduce((s, i) => s + i.quantityOrdered, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 font-medium">Payment Method</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">
                    {paymentMethod === "CASH_ON_DELIVERY" ? "Cash on Delivery"
                      : paymentMethod === "CHEQUE" ? "Cheque"
                      : paymentMethod === "CREDIT" ? "Credit / AP"
                      : <span className="text-slate-400 font-normal">Not set</span>}
                  </span>
                </div>
              </div>

              {/* Total Value Box */}
              <div className="p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Total Value</span>
                <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {formatCurrency(totalValue)}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Initial Status</span>
                <Badge variant="outline" className="font-bold border-slate-300 dark:border-slate-700">
                  Draft
                </Badge>
              </div>

              {/* Validation warnings */}
              {(!supplierId || lineItems.length === 0 || !isChequeValid) && (
                <div className="space-y-1 pt-1">
                  {!supplierId && (
                    <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircleIcon className="w-3 h-3" /> Select a supplier vendor
                    </p>
                  )}
                  {lineItems.length === 0 && (
                    <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircleIcon className="w-3 h-3" /> Add at least one line item product
                    </p>
                  )}
                  {!isChequeValid && (
                    <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertCircleIcon className="w-3 h-3" /> Complete all cheque details
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  className="w-full h-10 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 border-0 shadow-md transition-all"
                  onClick={handleSubmit}
                  disabled={!supplierId || lineItems.length === 0 || submitting || !isChequeValid}
                >
                  {submitting ? (
                    <>
                      <RefreshCwIcon className="animate-spin size-4 mr-2" />
                      Creating Purchase Order...
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
                  className="w-full h-9 rounded-xl text-xs font-semibold border-slate-300 dark:border-slate-700"
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