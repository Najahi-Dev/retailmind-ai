// app/(dashboard)/users/AddUserModal.tsx
"use client";
import { useMutation } from "convex/react";
import { api }         from "@/convex/_generated/api";
import { useState }    from "react";
import { toast }       from "sonner";
import { useAuth } from "@/lib/auth-context";
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
import { RefreshCwIcon, UserPlusIcon, CrownIcon, ShieldCheckIcon, UserCheckIcon, Building2Icon,
  EyeIcon, EyeOffIcon } from "lucide-react";

interface Props {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
}

export default function AddUserModal({ open, onOpenChange }: Props) {
  const createUser = useMutation(api.users.createUser);

  const [form, setForm] = useState({
    name:  "",
    email: "",
    phone: "",
    role:  "staff" as "admin" | "manager" | "staff" | "supplier",
  });
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const set = (key: string, val: any) =>
    setForm(f => ({ ...f, [key]: val }));

  const { token } = useAuth();

  const generatePassword = () => {
    // Generate a random password of length 12
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(password);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email) return;
    setSubmitting(true);
    try {
      await createUser({
        token: token ?? undefined,
        name:  form.name,
        email: form.email,
        phone: form.phone || undefined,
        role:  form.role,
        password: password || undefined,   // Add this line
      });
      toast.success(`User ${form.name} created successfully!`);
      setForm({ name: "", email: "", phone: "", role: "staff" });
      setPassword("");   // Clear the password state
      setShowPassword(false); // Reset the visibility
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-xl border-slate-200 dark:border-slate-800 p-6">
        <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserPlusIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Add New User Account
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Register a new system user and assign their workspace role permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3.5 py-3">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="e.g. Sarah Connor"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                type="email"
                placeholder="sarah@retailmind.ai"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mobile Number</Label>
              <Input
                type="tel"
                placeholder="+94 77 123 4567"
                value={form.phone}
                onChange={e => set("phone", e.target.value)}
                className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-500"
              >
                {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generatePassword}
              className="mt-2 w-full text-xs"
            >
              Generate Password
            </Button>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">System Role</Label>
            <Select value={form.role} onValueChange={(val) => set("role", val)}>
              <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
                    <CrownIcon className="w-3.5 h-3.5" /> Administrator
                  </div>
                </SelectItem>
                <SelectItem value="manager">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheckIcon className="w-3.5 h-3.5" /> Store Manager
                  </div>
                </SelectItem>
                <SelectItem value="staff">
                  <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                    <UserCheckIcon className="w-3.5 h-3.5" /> Inventory Staff
                  </div>
                </SelectItem>
                <SelectItem value="supplier">
                  <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                    <Building2Icon className="w-3.5 h-3.5" /> Vendor Supplier
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
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
              ? <><RefreshCwIcon className="animate-spin size-4 mr-2" />Creating...</>
              : "Create User Account"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
