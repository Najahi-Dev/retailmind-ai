// app/(dashboard)/users/EditUserModal.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import {
  UserCheckIcon,
  RefreshCwIcon,
  SaveIcon,
  CameraIcon,
  UploadIcon,
} from "lucide-react";

interface Props {
  user: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditUserModal({ user, open, onOpenChange }: Props) {
  const router = useRouter();

  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const updateUserProfileImage = useMutation(api.users.updateUserProfileImage);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [role, setRole] = useState<"admin" | "manager" | "staff" | "supplier">("staff");
  const [plan, setPlan] = useState<"starter" | "growth" | "enterprise">("starter");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setImageUrl(user.imageUrl ?? "");
      setRole(user.role ?? "staff");
      setPlan(user.plan ?? "starter");
      setIsActive(user.isActive ?? true);
    }
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingImage(true);
    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) throw new Error("Failed to upload image file");
      const { storageId } = await result.json();

      const res = await updateUserProfileImage({
        userId: user._id,
        storageId,
      });

      if (res.imageUrl) {
        setImageUrl(res.imageUrl);
        toast.success("Profile photo uploaded!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

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
          imageUrl,
          role,
          plan,
          isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");

      toast.success("Updated Successfully");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "U";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-slate-200 dark:border-slate-800 p-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheckIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Edit User Profile & Photo
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Changes automatically update Convex DB and sync user roles/status with Clerk Auth.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-3">
          {/* Avatar Photo Header */}
          <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="relative group shrink-0">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={name}
                  className="size-12 rounded-xl object-cover border border-slate-300 dark:border-slate-700 shadow-sm"
                />
              ) : (
                <div className="size-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-base shadow-sm">
                  {initials}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute -bottom-1 -right-1 size-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md transition-transform group-hover:scale-110"
                title="Upload custom photo"
              >
                {uploadingImage ? (
                  <RefreshCwIcon className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <CameraIcon className="w-2.5 h-2.5" />
                )}
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{name}</p>
              <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline mt-0.5"
              >
                {uploadingImage ? "Uploading photo..." : "Upload Profile Photo"}
              </button>
            </div>
          </div>

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
                  <SelectItem value="pending">Pending Approval</SelectItem>
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
                <RefreshCwIcon className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <SaveIcon className="w-3.5 h-3.5 mr-1.5" /> Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
