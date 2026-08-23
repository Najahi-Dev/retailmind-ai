// app/(dashboard)/alerts/CreateAlertDialog.tsx
"use client";
import { useQuery, useMutation } from "convex/react";
import { api }         from "@/convex/_generated/api";
import { Id }          from "@/convex/_generated/dataModel";
import { useState, useMemo }    from "react";
import { toast }       from "sonner";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCwIcon, BellRingIcon, AlertTriangleIcon, PackageIcon } from "lucide-react";

interface Props {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
}

import { useAuth } from "@/lib/auth-context";

export default function CreateAlertDialog({ open, onOpenChange }: Props) {
  const { token } = useAuth();
  const createAlert = useMutation(api.alerts.createAlert);
  const formData = useQuery(api.inventory.getStockOutFormData, { token: token ?? undefined });

  const [form, setForm] = useState({
    productId: "none",
    type: "low_stock" as "low_stock" | "critical_stock" | "overstock" | "demand_spike" | "supplier_delay" | "system",
    priority: "high" as "critical" | "high" | "medium" | "low",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (key: string, val: any) =>
    setForm(f => ({ ...f, [key]: val }));

  // Deduplicate products
  const uniqueProducts = useMemo(() => {
    if (!formData?.products) return [];
    const map = new Map<string, any>();
    for (const item of formData.products) {
      if (item && !map.has(item._id)) map.set(item._id, item);
    }
    return Array.from(map.values());
  }, [formData]);

  const handleSubmit = async () => {
    if (!form.message.trim()) return;
    setSubmitting(true);
    try {
      const selectedProduct = uniqueProducts.find((p) => p._id === form.productId);

      await createAlert({
        productId: form.productId !== "none" ? (form.productId as Id<"products">) : undefined,
        type: form.type,
        priority: form.priority,
        message: form.message,
      });

      // Dispatch Email Notification via Resend API
      try {
        await fetch("/api/alerts/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: `[${form.priority.toUpperCase()}] ${form.message.substring(0, 50)}...`,
            alertType: form.type,
            priority: form.priority,
            message: form.message,
            productName: selectedProduct?.name,
            sku: selectedProduct?.sku,
          }),
        });
      } catch (e) {
        console.error("Email dispatch failed silently:", e);
      }

      toast.success("Alert notification dispatched & email triggered successfully!");
      setForm({ productId: "none", type: "low_stock", priority: "high", message: "" });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create alert");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl border-slate-200 dark:border-slate-800 p-6">
        <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BellRingIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Dispatch Custom System Alert
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Create an operational warning or stock alert for team members
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3.5 py-3">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Product (Optional)</Label>
            <Select value={form.productId} onValueChange={(val) => set("productId", val)}>
              <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="Select target product..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">General System Alert (No Product)</SelectItem>
                {uniqueProducts.map(p => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name} ({p.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Alert Category</Label>
              <Select value={form.type} onValueChange={(val) => set("type", val)}>
                <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low_stock">Low Stock Warning</SelectItem>
                  <SelectItem value="critical_stock">Critical Out-of-Stock</SelectItem>
                  <SelectItem value="overstock">Overstock Warning</SelectItem>
                  <SelectItem value="demand_spike">Demand Spike</SelectItem>
                  <SelectItem value="supplier_delay">Supplier Delay</SelectItem>
                  <SelectItem value="system">System Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Priority Level</Label>
              <Select value={form.priority} onValueChange={(val) => set("priority", val)}>
                <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">🔴 Critical Priority</SelectItem>
                  <SelectItem value="high">🟠 High Priority</SelectItem>
                  <SelectItem value="medium">🟡 Medium Priority</SelectItem>
                  <SelectItem value="low">🔵 Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Alert Message <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="e.g. Warehouse A reports immediate stock deficit for Coffee Beans Premium..."
              value={form.message}
              onChange={e => set("message", e.target.value)}
              rows={3}
              className="text-xs rounded-xl border-slate-200 dark:border-slate-800 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="h-9 rounded-xl text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.message.trim() || submitting}
            className="h-9 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-5 shadow-md border-0"
          >
            {submitting
              ? <><RefreshCwIcon className="animate-spin size-4 mr-2" />Dispatching...</>
              : "Dispatch Alert"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
