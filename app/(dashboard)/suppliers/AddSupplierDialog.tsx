// app/(dashboard)/suppliers/AddSupplierDialog.tsx
"use client";
import { useMutation } from "convex/react";
import { api }         from "@/convex/_generated/api";
import { useState }    from "react";
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
import { RefreshCwIcon, Building2Icon } from "lucide-react";

interface Props {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
}

const PAYMENT_TERMS = ["Net 30", "Net 15", "Net 60", "COD", "Prepaid"];

export default function AddSupplierDialog({ open, onOpenChange }: Props) {
  const createSupplier = useMutation(api.suppliers.createSupplier);

  const [form, setForm] = useState({
    name:         "",
    email:        "",
    phone:        "",
    address:      "",
    paymentTerms: "Net 30",
    leadTimeDays: "7",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (key: string, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name || !form.email) return;
    setSubmitting(true);
    try {
      await createSupplier({
        name:         form.name,
        email:        form.email,
        phone:        form.phone   || undefined,
        address:      form.address || undefined,
        paymentTerms: form.paymentTerms || undefined,
        leadTimeDays: Number(form.leadTimeDays) || 7,
      });
      toast.success(`${form.name} added successfully!`);
      setForm({ name: "", email: "", phone: "", address: "", paymentTerms: "Net 30", leadTimeDays: "7" });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add supplier");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl border-slate-200 dark:border-slate-800 p-6">
        <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Add New Supplier
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Register a new vendor supplier partner in the system
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3.5 py-3">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Company Name <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. Ceylon Traders Ltd"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              type="email"
              placeholder="contact@supplier.com"
              value={form.email}
              onChange={e => set("email", e.target.value)}
              className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone</Label>
              <Input
                placeholder="+94 77 123 4567"
                value={form.phone}
                onChange={e => set("phone", e.target.value)}
                className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Lead Time (days)</Label>
              <Input
                type="number"
                min={1}
                placeholder="7"
                value={form.leadTimeDays}
                onChange={e => set("leadTimeDays", e.target.value)}
                className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Payment Terms</Label>
            <Select value={form.paymentTerms} onValueChange={(val) => set("paymentTerms", val)}>
              <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Office Address</Label>
            <Input
              placeholder="123 Main Street, Colombo"
              value={form.address}
              onChange={e => set("address", e.target.value)}
              className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
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
            disabled={!form.name || !form.email || submitting}
            className="h-9 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-5 shadow-md border-0"
          >
            {submitting
              ? <><RefreshCwIcon className="animate-spin size-4 mr-2" />Adding...</>
              : "Add Supplier"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}