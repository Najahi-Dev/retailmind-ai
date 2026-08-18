// app/(dashboard)/users/[userId]/UserDetailClient.tsx
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UsersIcon,
  ChevronLeftIcon,
  SaveIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  CrownIcon,
  UserCheckIcon,
  Building2Icon,
  CheckCircle2Icon,
  XCircleIcon,
  LockIcon,
  MailIcon,
  CalendarIcon,
  KeyIcon,
  SparklesIcon,
  CameraIcon,
  UploadIcon,
  ImageIcon,
  ZapIcon,
  RocketIcon,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  userId: string;
  role: string;
}

const ROLE_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  admin: {
    label: "Administrator",
    bg: "bg-indigo-500/10",
    color: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/30",
  },
  manager: {
    label: "Store Manager",
    bg: "bg-emerald-500/10",
    color: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
  },
  staff: {
    label: "Inventory Staff",
    bg: "bg-blue-500/10",
    color: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
  },
  supplier: {
    label: "Vendor Supplier",
    bg: "bg-amber-500/10",
    color: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
  },
};

const PLAN_CONFIG: Record<string, { label: string; Icon: any; bg: string; color: string; border: string }> = {
  starter: {
    label: "Starter Plan",
    Icon: ZapIcon,
    bg: "bg-indigo-500/20 text-indigo-300 border-indigo-400/40",
    color: "text-indigo-400",
    border: "border-indigo-500/40",
  },
  growth: {
    label: "Growth Plan",
    Icon: RocketIcon,
    bg: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
    color: "text-emerald-400",
    border: "border-emerald-500/40",
  },
  enterprise: {
    label: "Enterprise VIP",
    Icon: CrownIcon,
    bg: "bg-amber-500/20 text-amber-300 border-amber-400/40",
    color: "text-amber-400",
    border: "border-amber-500/40",
  },
};

export default function UserDetailClient({ userId, role: callerRole }: Props) {
  const router = useRouter();
  const { refreshUser, token } = useAuth();
  const canManageSystemRole = ["admin", "manager"].includes(callerRole);

  const user = useQuery(api.users.getUserById, {
    userId: userId as Id<"users">,
  });

  const currentUser = useQuery(api.users.getCurrentUserRecord, { token: token ?? undefined });
  const isCurrentUser = currentUser?._id === user?._id;

  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const updateUserProfileImage = useMutation(api.users.updateUserProfileImage);
  const changePassword = useMutation(api.users.changePassword);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "manager" | "staff" | "supplier">("staff");
  const [isActive, setIsActive] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setImageUrl(user.imageUrl ?? "");
      setUserRole(user.role as any);
      setIsActive(user.isActive);
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
        toast.success("Avatar Image Uploaded Successfully");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword({
        token: token ?? undefined,
        currentPassword,
        newPassword,
      });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
          name,
          imageUrl,
          role: userRole,
          isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");

      await refreshUser();
      toast.success("Profile Updated Successfully");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  if (user === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-12 text-slate-500 font-semibold text-xs">
        <RefreshCwIcon className="animate-spin size-4 text-indigo-500" />
        Loading platform user profile...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
        <UsersIcon className="size-12 text-slate-400" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">User Record Not Found</h3>
        <p className="text-xs text-slate-500 max-w-sm">
          The requested platform user record does not exist or has been removed.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.back()} className="mt-2 rounded-xl text-xs">
          <ChevronLeftIcon className="w-4 h-4 mr-1" /> Return Back
        </Button>
      </div>
    );
  }

  const roleStyle = ROLE_CONFIG[userRole] ?? ROLE_CONFIG.staff;
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "U";
  const formattedDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* ── HERO BANNER ── */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 text-white p-6 rounded-xl shadow-xl border shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0 size-10 rounded-lg bg-white/10 hover:bg-white/20 border-white/20 text-white"
            >
              <ChevronLeftIcon className="w-5 h-5 text-indigo-200" />
            </Button>

            <div className="flex items-center gap-3.5">
              {/* Profile Photo Avatar with Upload Camera Overlay */}
              <div className="relative group shrink-0">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={name}
                    className="size-14 rounded-lg object-cover border-2 border-indigo-400/40 shadow-lg"
                  />
                ) : (
                  <div className="size-14 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md">
                    {initials}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute -bottom-1 -right-1 size-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md transition-transform group-hover:scale-110"
                  title="Upload profile photo"
                >
                  {uploadingImage ? (
                    <RefreshCwIcon className="w-3 h-3 animate-spin" />
                  ) : (
                    <CameraIcon className="w-3 h-3" />
                  )}
                </button>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{name}</h1>
                <p className="text-xs text-slate-300 font-medium mt-1 flex items-center gap-1.5">
                  <MailIcon className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                  <span>{user.email && user.email.trim() ? user.email : "No email registered"}</span>
                </p>
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <Badge className={`text-xs font-bold ${roleStyle.bg} ${roleStyle.color} border ${roleStyle.border} px-2.5 py-1 inline-flex items-center gap-1.5 rounded-full`}>
                    {roleStyle.label}
                  </Badge>

                  {(() => {
                    const planStyle = PLAN_CONFIG[(user.plan as any) || "starter"] ?? PLAN_CONFIG.starter;
                    const PlanIcon = planStyle.Icon;
                    return (
                      <Badge className={`text-xs font-bold px-2.5 py-1 inline-flex items-center justify-center gap-1.5 rounded-full border ${planStyle.bg} shadow-xs leading-none`}>
                        <PlanIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="leading-none">{planStyle.label}</span>
                      </Badge>
                    );
                  })()}

                  {isActive ? (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs px-2.5 py-1 inline-flex items-center gap-1.5 rounded-full">
                      <CheckCircle2Icon className="w-3.5 h-3.5" /> Active Account
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-300 border border-red-400/30 text-xs px-2.5 py-1 inline-flex items-center gap-1.5 rounded-full">
                      <XCircleIcon className="w-3.5 h-3.5" /> Suspended
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-10 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-5 shadow-md border-0"
            >
              {saving ? (
                <>
                  <RefreshCwIcon className="animate-spin size-4 mr-2" /> Saving Changes...
                </>
              ) : (
                <>
                  <SaveIcon className="w-4 h-4 mr-2" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General Profile</TabsTrigger>
          {isCurrentUser && (
            <TabsTrigger value="security">Security Settings</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="general">
          <div className="w-full">
            {/* ── PROFILE & EDIT FORM ── */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              User Profile & Access Controls
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Modify user details, system role, subscription level, and active account status
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5 space-y-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-800"
                placeholder="e.g. Ahmadh Najahi"
              />
            </div>

            {/* Profile Avatar Photo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Profile Avatar Photo
              </Label>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={name}
                      className="size-10 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
                    />
                  ) : (
                    <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/20">
                      {initials}
                    </div>
                  )}
                </div>

                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Paste image URL or click Upload..."
                  className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-800 flex-1"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 rounded-xl text-xs font-semibold shrink-0"
                >
                  {uploadingImage ? (
                    <RefreshCwIcon className="w-3.5 h-3.5 mr-1.5 animate-spin text-indigo-500" />
                  ) : (
                    <UploadIcon className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                  )}
                  Upload Photo
                </Button>
              </div>
            </div>

            {/* Email Address (Read-only) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</Label>
              <div className="relative">
                <Input
                  value={user.email}
                  disabled
                  className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed pr-10"
                />
                <LockIcon className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* System Role */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">System Role</Label>
                <Select value={userRole} onValueChange={(val: any) => setUserRole(val)} disabled={!canManageSystemRole}>
                  <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator (Full Access)</SelectItem>
                    <SelectItem value="manager">Store Manager</SelectItem>
                    <SelectItem value="staff">Inventory Staff</SelectItem>
                    <SelectItem value="supplier">Vendor Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Workspace Inherited Plan */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Workspace Subscription</Label>
                <div className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const rawTier = (user as any).planTier || user.plan || "starter";
                      const planKey = String(rawTier).toLowerCase();
                      const planStyle = PLAN_CONFIG[planKey] ?? PLAN_CONFIG.starter;
                      const PlanIcon = planStyle.Icon;
                      return (
                        <>
                          <PlanIcon className={`size-4 ${planStyle.color}`} />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {planStyle.label}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Inherited
                  </Badge>
                </div>
              </div>
            </div>

            {/* Account Status Switch */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Account Status</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {isActive
                    ? "Account is Active. User can sign in and access RetailMind AI."
                    : "Account is Banned/Suspended. User is blocked in Clerk Auth and Convex DB."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => canManageSystemRole && setIsActive(!isActive)}
                disabled={!canManageSystemRole}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-1 ${
                  !canManageSystemRole ? "opacity-60 cursor-not-allowed" : ""
                } ${
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
          </CardContent>
        </Card>
          </div>
        </TabsContent>
      
      {/* Security Settings Card */}
      {isCurrentUser && (
        <TabsContent value="security">
          <div className="w-full">
          <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-950">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <LockIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Security Settings
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Update your authentication password
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-5 space-y-5">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Current Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-800"
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-800"
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-10 text-xs rounded-xl border-slate-200 dark:border-slate-800"
                    placeholder="Confirm new password"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full sm:w-auto h-10 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md"
                >
                  {changingPassword ? (
                    <><RefreshCwIcon className="w-3.5 h-3.5 mr-2 animate-spin" /> Updating...</>
                  ) : (
                    <><KeyIcon className="w-3.5 h-3.5 mr-2" /> Change Password</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
          </div>
        </TabsContent>
      )}
      </Tabs>
    </div>
  );
}
