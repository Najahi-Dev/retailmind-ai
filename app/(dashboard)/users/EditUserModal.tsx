// app/(dashboard)/users/EditUserModal.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCheckIcon, RefreshCwIcon, SaveIcon, SparklesIcon } from "lucide-react";

interface Props {
  user: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditUserModal({ user, open, onOpenChange }: Props) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "staff" | "supplier">("staff");
  const [plan, setPlan] = useState<"starter" | "growth" | "enterprise">("starter");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setRole(user.role ?? "staff");
      setPlan(user.plan ?? "starter");
      setIsActive(user.isActive ?? true);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error("User name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          clerkId: user.clerkId,
          name,
          role,
          plan,
          isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");

      toast.success(data.message || "User profile & status successfully updated in both Convex DB and Clerk Auth!");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-slate-200 dark:border-slate-800 p-6">
        <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {user.imageUrl ? (
              <img src={user.imageUrl} alt={name} className="size-6 rounded-full object-cover border border-indigo-500/20" />
            ) : (
              <UserCheckIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            )}
            Edit User Profile & Status
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Changes automatically update Convex DB and sync user roles/status with Clerk Auth.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-3">
          {/* Full Name */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
            />
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</Label>
            <Input
              value={user.email}
              disabled
              className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* System Role */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">System Role</Label>
              <Select value={role} onValueChange={(val: any) => setRole(val)}>
                <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="manager">Store Manager</SelectItem>
                  <SelectItem value="staff">Inventory Staff</SelectItem>
                  <SelectItem value="supplier">Vendor Supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subscription Plan */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Plan</Label>
              <Select value={plan} onValueChange={(val: any) => setPlan(val)}>
                <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Account Status Toggle */}
          <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Account Status</p>
              <p className="text-[11px] text-slate-500">
                {isActive ? "Active Account" : "Suspended / Banned in Clerk"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-1 ${
                isActive ? "bg-emerald-600" : "bg-red-500"
              }`}
            >
              <div
                className={`size-4 rounded-full bg-white transition-transform ${
                  isActive ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 rounded-xl text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-9 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4"
          >
            {saving ? (
              <>
                <RefreshCwIcon className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <SaveIcon className="w-3.5 h-3.5 mr-1.5" /> Save & Sync Clerk & DB
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
