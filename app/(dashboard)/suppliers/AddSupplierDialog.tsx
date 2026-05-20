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
import { RefreshCwIcon } from "lucide-react";

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

  const inputClass = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Supplier</DialogTitle>
          <DialogDescription>
            Add a new supplier to the system
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <div className="grid grid-cols-1 gap-3">

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Company Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Ceylon Traders Ltd"
                value={form.name}
                onChange={e => set("name", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Email <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                placeholder="contact@supplier.com"
                value={form.email}
                onChange={e => set("email", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  placeholder="+94 77 123 4567"
                  value={form.phone}
                  onChange={e => set("phone", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Lead Time (days)</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="7"
                  value={form.leadTimeDays}
                  onChange={e => set("leadTimeDays", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payment Terms</label>
              <select
                value={form.paymentTerms}
                onChange={e => set("paymentTerms", e.target.value)}
                className={inputClass}
              >
                {PAYMENT_TERMS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Address</label>
              <Input
                placeholder="123 Main Street, Colombo"
                value={form.address}
                onChange={e => set("address", e.target.value)}
              />
            </div>

          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.name || !form.email || submitting}
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