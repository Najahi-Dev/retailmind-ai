"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarcodeGenerator } from "@/components/ui/barcode-generator";
import { Logo } from "@/components/logo";
import {
  PrinterIcon,
  MailIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileTextIcon,
  Building2Icon,
  SendIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { printElement, printPOInvoiceSampleFormat } from "@/lib/print-helper";

interface LineItem {
  productId: string;
  productName: string;
  sku: string;
  quantityOrdered: number;
  unitCost: number;
  lineTotal: number;
}

interface InvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po: {
    _id: string;
    poNumber: string;
    invoiceNumber?: string;
    status: string;
    createdAt: number;
    supplierName: string;
    supplierEmail?: string;
    supplierPhone?: string;
    supplierAddress?: string;
    totalValue: number;
    lineItems: LineItem[];
    paymentStatus?: string;
    paymentMethod?: string;
    amountPaid?: number;
  };
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  open,
  onOpenChange,
  po,
}) => {
  const { currentUser } = useAuth();
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);

  const supplierDefaultEmail =
    po.supplierEmail && po.supplierEmail.trim()
      ? po.supplierEmail.trim()
      : po.supplierName
        ? `orders@${po.supplierName.toLowerCase().replace(/[^a-z0-9]/g, "")}.lk`
        : "supplier@vendor.com";

  const [recipientEmail, setRecipientEmail] = useState(supplierDefaultEmail);

  React.useEffect(() => {
    setRecipientEmail(supplierDefaultEmail);
  }, [po.supplierEmail, po.supplierName, open]);

  const autoInvoiceNumber = po.invoiceNumber || `INV-${po.poNumber.replace(/^PO-/, "")}`;
  const invoiceDateStr = new Date(po.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formatLKR = (amount: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      maximumFractionDigits: 0,
    }).format(amount);

  const handlePrint = () => {
    printPOInvoiceSampleFormat({
      poNumber: po.poNumber,
      invoiceNumber: autoInvoiceNumber,
      createdAt: po.createdAt,
      supplierName: po.supplierName,
      supplierEmail: po.supplierEmail,
      supplierPhone: po.supplierPhone,
      supplierAddress: po.supplierAddress,
      salesPersonName: currentUser?.name || "Najahi",
      totalValue: po.totalValue,
      lineItems: po.lineItems,
      paymentMethod: po.paymentMethod,
      paymentStatus: po.paymentStatus,
      amountPaid: po.amountPaid,
    });
  };

  const handleDispatchEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = recipientEmail.trim();
    if (!targetEmail) {
      toast.error("Please enter a valid recipient email address.");
      return;
    }

    setSendingEmail(true);
    try {
      const res = await fetch("/api/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: targetEmail,
          invoiceNumber: autoInvoiceNumber,
          poNumber: po.poNumber,
          supplierName: po.supplierName,
          supplierEmail: po.supplierEmail,
          supplierPhone: po.supplierPhone,
          supplierAddress: po.supplierAddress,
          totalValue: po.totalValue,
          lineItems: po.lineItems,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Invoice ${autoInvoiceNumber} dispatched to ${targetEmail}!`);
        setShowEmailPrompt(false);
      } else {
        toast.error(data.error || "Failed to send email.");
      }
    } catch (err) {
      toast.error("Network error sending invoice email.");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleOpenGmailMailto = () => {
    const subject = encodeURIComponent(`[Commercial Invoice] ${autoInvoiceNumber} for PO ${po.poNumber}`);
    const body = encodeURIComponent(
      `Dear ${po.supplierName},\n\nPlease find the details for Commercial Invoice ${autoInvoiceNumber} (Ref PO: ${po.poNumber}):\n\n` +
      `Total Invoice Valuation: LKR ${po.totalValue.toLocaleString()}\nDate: ${invoiceDateStr}\n\n` +
      `Best regards,\nRetailMind AI Store Operations`
    );
    window.open(`mailto:${recipientEmail.trim()}?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-4xl max-w-[95vw] w-full max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Action Header Bar (Hidden during printing) */}
        <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <FileTextIcon className="w-5 h-5 text-indigo-400 shrink-0" />
            <DialogTitle className="font-bold text-sm text-white">
              Commercial Invoice Specification
            </DialogTitle>
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-400/30 text-[11px] px-2 py-0.5 font-mono">
              {autoInvoiceNumber}
            </Badge>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowEmailPrompt(!showEmailPrompt)}
              className="h-8 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border-0 px-3.5 shadow-sm"
            >
              <MailIcon className="w-3.5 h-3.5 mr-1.5" />
              Send via Email
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs font-bold rounded-xl bg-white text-slate-900 hover:bg-slate-100 border-0 px-4 shadow-sm"
            >
              <PrinterIcon className="w-3.5 h-3.5 mr-1.5 text-slate-700" />
              Print Invoice
            </Button>

            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/80 ml-1"
                title="Close modal"
              >
                <XIcon className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </div>
        </div>

        {/* Email Dispatch Settings Bar (Toggleable) */}
        {showEmailPrompt && (
          <div className="p-4 bg-indigo-950/80 border-b border-indigo-800 text-white animate-in slide-in-from-top-2 duration-200">
            <form onSubmit={handleDispatchEmail} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 max-w-3xl mx-auto">
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-semibold text-indigo-200">Recipient Gmail / Email Address</Label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. mohamedashan070@gmail.com"
                  required
                  className="h-9 text-xs rounded-xl bg-slate-900/90 border-indigo-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={sendingEmail}
                  className="h-9 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border-0 px-4 shadow-sm"
                >
                  {sendingEmail ? (
                    <RefreshCwIcon className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <SendIcon className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Send Email
                </Button>

                <Button
                  type="button"
                  onClick={handleOpenGmailMailto}
                  variant="outline"
                  className="h-9 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-indigo-200 border-indigo-700 px-3"
                  title="Open directly in your default Gmail client"
                >
                  Open in Gmail App
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Printable Invoice Container */}
        <div id="printable-invoice" className="p-5 sm:p-8 space-y-6 text-slate-900 dark:text-white bg-white dark:bg-slate-900">
          {/* Header Row: Logo & Invoice Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="space-y-1.5">
              <Logo layout="horizontal" size="sm" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Supermarket Retail Network • Colombo, Sri Lanka
              </p>
            </div>

            <div className="sm:text-right space-y-0.5">
              <span className="text-[11px] uppercase font-extrabold tracking-widest text-indigo-600 dark:text-indigo-400 block">
                Tax Commercial Invoice
              </span>
              <h2 className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900 dark:text-white">
                {autoInvoiceNumber}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Date: {invoiceDateStr} • PO Ref: {po.poNumber}
              </p>
              {po.paymentMethod && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Payment Method: {po.paymentMethod}
                </p>
              )}
              {po.paymentStatus && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Payment Status: {po.paymentStatus}
                </p>
              )}
              {po.paymentStatus && (
                <Badge className={`text-[10px] font-bold px-2 py-0.5 ${
                  po.paymentStatus === "PAID" || po.paymentStatus === "paid"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : po.paymentStatus === "CHEQUE_PENDING"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : po.paymentStatus === "DUE" || po.paymentStatus === "OVERDUE"
                    ? "bg-red-500/10 text-red-600 border-red-500/20"
                    : po.paymentStatus === "PARTIALLY_PAID" || po.paymentStatus === "partial"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : po.paymentStatus === "PENDING_ON_DELIVERY"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
                  >
                  {po.paymentStatus === "PAID" || po.paymentStatus === "paid" ? "Paid"
                    : po.paymentStatus === "CHEQUE_PENDING" ? "Cheque Pending"
                    : po.paymentStatus === "DUE" ? "DUE"
                    : po.paymentStatus === "OVERDUE" ? "OVERDUE"
                    : po.paymentStatus === "PARTIALLY_PAID" || po.paymentStatus === "partial" ? "Partial"
                    : po.paymentStatus === "PENDING_ON_DELIVERY" ? "Pending on Delivery"
                    : po.paymentStatus}
                </Badge>
              )}
            </div>
          </div>

          {/* Billing & Vendor Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="space-y-1 min-w-0">
              <span className="font-extrabold uppercase text-[10px] text-slate-400 tracking-wider block">
                Billed To (Customer / Retailer)
              </span>
              <p className="font-bold text-sm text-slate-900 dark:text-white truncate">RetailMind AI Store Operations</p>
              <p className="text-slate-600 dark:text-slate-300">Main Commercial Warehouse, Branch #01</p>
              <p className="text-slate-600 dark:text-slate-300">No. 142 Galle Road, Colombo 03, Sri Lanka</p>
              <p className="text-slate-500 font-mono truncate">ops@retailmind.lk • +94 11 755 8800</p>
            </div>

            <div className="space-y-1 min-w-0">
              <span className="font-extrabold uppercase text-[10px] text-slate-400 tracking-wider block">
                Issued By (Vendor Supplier)
              </span>
              <p className="font-bold text-sm text-indigo-600 dark:text-indigo-400 truncate">{po.supplierName}</p>
              <p className="text-slate-600 dark:text-slate-300">{po.supplierAddress || "Vendor Supplier Facilities"}</p>
              <p className="text-slate-500 font-mono truncate">Email: {po.supplierEmail || "vendor@supplier.com"}</p>
              <p className="text-slate-500 font-mono truncate">Phone: {po.supplierPhone || "+94 11 200 4455"}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3">Item Specification</th>
                  <th className="p-3">SKU / Barcode</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Total (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {po.lineItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{item.productName}</td>
                    <td className="p-3 font-mono text-slate-500">{item.sku}</td>
                    <td className="p-3 text-right font-mono">{formatLKR(item.unitCost)}</td>
                    <td className="p-3 text-center font-bold">{item.quantityOrdered}</td>
                    <td className="p-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {formatLKR(item.lineTotal || item.unitCost * item.quantityOrdered)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Grid: Barcode & Financial Calculation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-end pt-2">
            {/* Scannable Code128 Barcode */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center overflow-hidden">
              <BarcodeGenerator value={autoInvoiceNumber} width={1.4} height={45} showText={true} />
              <p className="text-[10px] text-slate-400 font-mono mt-1 truncate max-w-full">
                Official RetailMind Invoice Verification Code
              </p>
            </div>

            {/* Financial Totals */}
            <div className="space-y-2 text-xs p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 gap-2">
                <span>Subtotal (Net Amount):</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white shrink-0">{formatLKR(po.totalValue)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 gap-2">
                <span>VAT / NBT Tax (0% Exempt):</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white shrink-0">LKR 0</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-extrabold text-sm text-indigo-600 dark:text-indigo-400 gap-2">
                <span>Invoice Grand Total:</span>
                <span className="font-mono text-sm sm:text-base shrink-0">{formatLKR(po.totalValue)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

    </Dialog>
  );
};
