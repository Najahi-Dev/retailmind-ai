"use client";
import { useQuery, useMutation } from "convex/react";
import { api }    from "@/convex/_generated/api";
import { Id }     from "@/convex/_generated/dataModel";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge }   from "@/components/ui/badge";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeftIcon, CheckCircleIcon, XCircleIcon,
  AlertTriangleIcon, PackageIcon, RefreshCwIcon,
  Building2Icon, CalendarIcon, SparklesIcon, ShoppingCartIcon,
  BanknoteIcon, HandshakeIcon, CheckCircle2Icon,
  FileCheckIcon, InfoIcon, ClockIcon,
} from "lucide-react";

const URGENCY_CONFIG = {
  critical: {
    label: "Critical Stockout",
    badgeClass: "bg-red-500/20 text-red-300 border-red-400/30",
    color: "text-red-500",
  },
  high: {
    label: "High Priority",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-400/30",
    color: "text-amber-500",
  },
  medium: {
    label: "Medium Buffer",
    badgeClass: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30",
    color: "text-yellow-500",
  },
  low: {
    label: "Low Urgency",
    badgeClass: "bg-slate-500/20 text-slate-300 border-slate-400/30",
    color: "text-slate-400",
  },
};

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

type PaymentMethod = "CASH_ON_DELIVERY" | "CHEQUE" | "CREDIT" | "";

export default function ReorderReviewClient({
  suggestionId,
}: {
  suggestionId: string;
}) {
  const router   = useRouter();
  const { token } = useAuth();
  const detail   = useQuery(api.reorder.getReorderDetail, {
    suggestionId: suggestionId as Id<"reorderSuggestions">,
  });
  const approve  = useMutation(api.reorder.approveSuggestion);
  const dismiss  = useMutation(api.reorder.dismissSuggestion);

  const [quantity,      setQuantity]      = useState<number | "">("");
  const [unitCost,      setUnitCost]      = useState<number | "">("");
  const [supplierId,    setSupplierId]    = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("");
  const [submitting,    setSubmitting]    = useState(false);

  // Cheque fields
  const [chequeNumber,  setChequeNumber]  = useState("");
  const [bankName,      setBankName]      = useState("");
  const [chequeAmount,  setChequeAmount]  = useState<number | "">("");
  const [chequeDate,    setChequeDate]    = useState("");
  const [chequeStatus,  setChequeStatus]  = useState<"ISSUED" | "CLEARED" | "BOUNCED">("ISSUED");

  // Credit fields
  const [creditTermDays, setCreditTermDays] = useState<number>(30);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(val);

  // Pre-fill when data loads
  if (detail && quantity === "" && unitCost === "") {
    setQuantity(detail.suggestion.suggestedQuantity);
    setUnitCost(detail.product?.costPrice ?? 0);
    setSupplierId(detail.suggestion.preferredSupplierId ?? "");
  }

  // Auto-fill chequeAmount when totalValue changes
  const totalValue = Number(quantity || 0) * Number(unitCost || 0);
  if (paymentMethod === "CHEQUE" && chequeAmount === "" && totalValue > 0) {
    setChequeAmount(totalValue);
  }

  const isChequeValid = paymentMethod !== "CHEQUE" || (
    chequeNumber.trim() !== "" && bankName !== "" && chequeDate !== ""
  );

  const handleApprove = async () => {
    if (!quantity || !unitCost || !supplierId) return;
    if (!isChequeValid) return;
    setSubmitting(true);
    try {
      // Build credit dueDate from term days
      const computedDueDate = paymentMethod === "CREDIT"
        ? Date.now() + creditTermDays * 24 * 60 * 60 * 1000
        : undefined;

      await approve({
        token: token,
        suggestionId: suggestionId as Id<"reorderSuggestions">,
        supplierId:   supplierId as Id<"suppliers">,
        quantity:     Number(quantity),
        unitCost:     Number(unitCost),
        paymentMethod: paymentMethod || undefined,
        // Cheque
        chequeNumber:  paymentMethod === "CHEQUE" ? chequeNumber : undefined,
        bankName:      paymentMethod === "CHEQUE" ? bankName : undefined,
        chequeAmount:  paymentMethod === "CHEQUE" ? (Number(chequeAmount) || totalValue) : undefined,
        chequeDate:    paymentMethod === "CHEQUE" && chequeDate ? new Date(chequeDate).getTime() : undefined,
        chequeStatus:  paymentMethod === "CHEQUE" ? chequeStatus : undefined,
        // Credit
        creditTermDays: paymentMethod === "CREDIT" ? creditTermDays : undefined,
        dueDate:        computedDueDate,
      });
      router.push(`/reorders/purchase-orders`);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    await dismiss({ token: token, suggestionId: suggestionId as Id<"reorderSuggestions"> });
    router.push("/reorders");
  };

  if (!detail) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-12 text-slate-500 font-semibold text-xs">
        <RefreshCwIcon className="animate-spin size-4 text-indigo-500" />
        Loading reorder suggestion specifications...
      </div>
    );
  }

  const { suggestion, product, inventory, allSuppliers } = detail;
  const urgencyCfg = URGENCY_CONFIG[suggestion.urgency];

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full">
      {/* ── 1. EXECUTIVE HERO HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
        {/* Glow Ambient Effect */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

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
                  Review Reorder &amp; Issue Vendor PO
                </h1>
                <Badge className={`text-xs font-extrabold px-2.5 py-0.5 border ${urgencyCfg.badgeClass}`}>
                  <AlertTriangleIcon className="w-3.5 h-3.5 mr-1" />
                  {urgencyCfg.label}
                </Badge>
                {suggestion.status !== "pending" && (
                  <Badge className="text-xs font-bold bg-white/10 text-indigo-200 border-white/20 capitalize">
                    {suggestion.status}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                <span className="font-mono text-indigo-300 font-bold">SKU: {product?.sku}</span> • {product?.name}
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
          </div>
        </div>
      </div>

      {/* ── 2. TWO COLUMN REVIEW GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column — AI Rationale & Stock Levels */}
        <div className="space-y-5">
          {/* Card 1: AI Rationale */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                AI Replenishment Rationale
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                {suggestion.rationale}
              </p>
              {suggestion.orderByDate && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" /> Recommended Order By:
                  </span>
                  <Badge variant="outline" className="font-bold text-indigo-600 dark:text-indigo-400 border-indigo-500/20 bg-indigo-500/5">
                    {new Date(suggestion.orderByDate).toLocaleDateString("en-US", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Current Stock Levels & Capacity Gauge */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PackageIcon className="w-4 h-4 text-emerald-500" />
                Current Stock Levels &amp; Safety Buffer
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {[
                { label: "On Hand Stock", value: `${inventory?.onHand ?? 0} ${product?.unit}`, highlight: false },
                { label: "Available Net Stock", value: `${inventory?.available ?? 0} ${product?.unit}`, highlight: false },
                { label: "Safety Stock Buffer", value: `${product?.safetyStock ?? 0} ${product?.unit}`, highlight: (inventory?.onHand ?? 0) <= (product?.safetyStock ?? 0) },
                { label: "Reorder Trigger Point", value: `${product?.reorderPoint ?? 0} ${product?.unit}`, highlight: (inventory?.onHand ?? 0) <= (product?.reorderPoint ?? 0) },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0 text-xs">
                  <span className="text-slate-500 font-medium">{row.label}</span>
                  <span className={`font-bold tabular-nums ${row.highlight ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
                    {row.value}
                  </span>
                </div>
              ))}

              {/* Stock Capacity Gauge */}
              <div className="pt-2">
                <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                  <span>Stock Buffer Status</span>
                  <span>{Math.round(Math.min(100, ((inventory?.onHand ?? 0) / ((product?.reorderPoint ?? 1) * 3)) * 100))}% Capacity</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      suggestion.urgency === "critical" ? "bg-red-500" :
                      suggestion.urgency === "high"     ? "bg-amber-500"  :
                      "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.min(100, ((inventory?.onHand ?? 0) / ((product?.reorderPoint ?? 1) * 3)) * 100)}%`
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Create PO Form */}
        <div className="space-y-5">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCartIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Create Vendor Purchase Order
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Adjust order lines and supplier specs before issuing PO
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Supplier Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building2Icon className="w-3.5 h-3.5 text-indigo-500" /> Primary Supplier / Vendor
                </Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="w-full h-9 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allSuppliers?.map(s => (
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
              </div>

              {/* Quantity Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Order Quantity ({product?.unit})
                  </Label>
                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                    Suggested: {suggestion.suggestedQuantity} {product?.unit}
                  </span>
                </div>
                <Input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  min={1}
                  className="h-9 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>

              {/* Unit Cost Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Unit Cost Basis (LKR)</Label>
                <Input
                  type="number"
                  value={unitCost}
                  onChange={e => setUnitCost(Number(e.target.value))}
                  min={0}
                  className="h-9 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>

              {/* Order Summary Box */}
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 p-4 space-y-2.5">
                <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Purchase Order Summary
                </p>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Quantity</span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums">{quantity || 0} {product?.unit}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Unit Cost</span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(Number(unitCost || 0))}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Payment Method</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {paymentMethod === "CASH_ON_DELIVERY" ? "Cash on Delivery"
                      : paymentMethod === "CHEQUE" ? "Cheque Payment"
                      : paymentMethod === "CREDIT" ? "Credit / Accounts Payable"
                      : <span className="text-slate-400 font-normal">Not selected</span>}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-200 dark:border-slate-700 pt-2 font-extrabold text-indigo-600 dark:text-indigo-400">
                  <span>Total PO Valuation</span>
                  <span className="tabular-nums">{formatCurrency(totalValue)}</span>
                </div>
              </div>

              {/* ── PAYMENT METHOD SELECTOR ── */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Method <span className="text-slate-400 font-normal">(Optional)</span>
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: "CASH_ON_DELIVERY" as PaymentMethod, label: "Cash on Delivery",       icon: BanknoteIcon,  color: "emerald" },
                    { value: "CHEQUE"           as PaymentMethod, label: "Cheque Payment",          icon: FileCheckIcon, color: "amber"   },
                    { value: "CREDIT"           as PaymentMethod, label: "Credit / Accounts Payable", icon: HandshakeIcon, color: "blue"    },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = paymentMethod === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPaymentMethod(isSelected ? "" : opt.value)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 transition-all text-left w-full ${
                          isSelected
                            ? `border-${opt.color}-500 bg-${opt.color}-50 dark:bg-${opt.color}-950/30`
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${
                          isSelected ? `bg-${opt.color}-500 text-white` : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}>
                          <Icon className="size-3.5" />
                        </div>
                        <span className={`text-xs font-bold ${
                          isSelected ? `text-${opt.color}-700 dark:text-${opt.color}-300` : "text-slate-700 dark:text-slate-300"
                        }`}>{opt.label}</span>
                        {isSelected && <CheckCircle2Icon className={`size-4 ml-auto text-${opt.color}-500`} />}
                      </button>
                    );
                  })}
                </div>
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
                        value={chequeAmount}
                        onChange={e => setChequeAmount(Number(e.target.value))}
                        className="h-8 text-xs rounded-lg border-amber-300/60 dark:border-amber-700/40 bg-white dark:bg-slate-900"
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

                  {/* Validation hint */}
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

              {/* Form Actions */}
              {suggestion.status === "pending" ? (
                <div className="flex gap-2 pt-1">
                  <Button
                    className="flex-1 h-10 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 border-0 shadow-md transition-all"
                    onClick={handleApprove}
                    disabled={submitting || !supplierId || !quantity || !unitCost || !isChequeValid}
                  >
                    {submitting ? (
                      <RefreshCwIcon className="animate-spin size-4 mr-2" />
                    ) : (
                      <CheckCircleIcon className="size-4 mr-2" />
                    )}
                    Approve &amp; Create PO
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDismiss}
                    disabled={submitting}
                    className="h-10 rounded-xl text-xs font-semibold border-slate-300 dark:border-slate-700 px-4"
                  >
                    <XCircleIcon className="size-4 mr-1.5 text-slate-400" />
                    Dismiss
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center py-3">
                  <Badge
                    className={`text-xs font-bold px-4 py-2 ${
                      suggestion.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {suggestion.status === "approved" ? (
                      <><CheckCircleIcon className="size-3.5 mr-2" />Approved — PO Generated</>
                    ) : (
                      "Dismissed"
                    )}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}