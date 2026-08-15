"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BarcodeGenerator } from "@/components/ui/barcode-generator";
import { PrinterIcon, TagIcon } from "lucide-react";

interface BarcodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    sku: string;
    name: string;
    category?: string;
    price?: number;
  } | null;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({
  open,
  onOpenChange,
  product,
}) => {
  if (!product) return null;

  const handlePrintLabel = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl text-center space-y-4">
        <DialogHeader className="flex flex-col items-center">
          <div className="size-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
            <TagIcon className="w-6 h-6" />
          </div>
          <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-white">
            Product Barcode Label
          </DialogTitle>
          <p className="text-xs text-slate-500">Supermarket Shelf & POS Scanner Barcode Tag</p>
        </DialogHeader>

        {/* Printable Barcode Card Container */}
        <div id="printable-barcode-label" className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col items-center">
          <p className="font-bold text-sm text-slate-900 dark:text-white max-w-xs truncate">
            {product.name}
          </p>
          <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200">
            <BarcodeGenerator value={product.sku} width={2} height={60} showText={true} />
          </div>
          <div className="flex items-center justify-between w-full text-xs text-slate-500 px-2 font-mono">
            <span>{product.category || "General"}</span>
            {product.price ? <span className="font-bold text-indigo-600">LKR {product.price}</span> : null}
          </div>
        </div>

        <Button
          onClick={handlePrintLabel}
          className="w-full h-10 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-md"
        >
          <PrinterIcon className="w-4 h-4 mr-2" /> Print Shelf Barcode Label
        </Button>
      </DialogContent>
    </Dialog>
  );
};
