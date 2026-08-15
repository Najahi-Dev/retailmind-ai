// app/(dashboard)/users/UsersClient.tsx
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UsersIcon,
  UserPlusIcon,
  SearchIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  CrownIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  Building2Icon,
  XCircleIcon,
  SparklesIcon,
  LockIcon,
  CheckIcon,
  SlidersHorizontalIcon,
  EyeIcon,
  EditIcon,
} from "lucide-react";
import { toast } from "sonner";
import AddUserModal from "./AddUserModal";
import EditUserModal from "./EditUserModal";

interface Props {
  role: string;
}

const ROLE_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    color: string;
    border: string;
    icon: any;
  }
> = {
  admin: {
    label: "Administrator",
    bg: "bg-indigo-500/10",
    color: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/20",
    icon: CrownIcon,
  },
  manager: {
    label: "Store Manager",
    bg: "bg-emerald-500/10",
    color: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
    icon: ShieldCheckIcon,
  },
  staff: {
    label: "Inventory Staff",
    bg: "bg-blue-500/10",
    color: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
    icon: UserCheckIcon,
  },
  supplier: {
    label: "Vendor Supplier",
    bg: "bg-amber-500/10",
    color: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    icon: Building2Icon,
  },
  pending: {
    label: "Pending Approval",
    bg: "bg-orange-500/10",
    color: "text-orange-600 dark:text-orange-400 font-bold",
    border: "border-orange-500/30 animate-pulse",
    icon: SparklesIcon,
  },
};

export default function UsersClient({ role: currentRole }: Props) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const users = useQuery(api.users.getUsers, {
    role: roleFilter === "all" ? undefined : roleFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const stats = useQuery(api.users.getUserStats);

  const updateUserFullDetail = useMutation(api.users.updateUserFullDetail);

  const handleRoleChange = async (userRecord: any, newRole: string) => {
    setUpdatingId(userRecord._id);
    try {
      await updateUserFullDetail({
        userId: userRecord._id,
        name: userRecord.name,
        imageUrl: userRecord.imageUrl,
        role: newRole as any,
        plan: (userRecord.plan as any) ?? "starter",
        isActive: userRecord.isActive,
      });
      toast.success("User Role Updated Successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusToggle = async (userRecord: any, currentStatus: boolean) => {
    setUpdatingId(userRecord._id);
    try {
      await updateUserFullDetail({
        userId: userRecord._id,
        name: userRecord.name,
        imageUrl: userRecord.imageUrl,
        role: userRecord.role,
        plan: (userRecord.plan as any) ?? "starter",
        isActive: !currentStatus,
      });
      toast.success("Account Status Updated Successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePlanChange = async (userRecord: any, newPlan: string) => {
    setUpdatingId(userRecord._id);
    try {
      await updateUserFullDetail({
        userId: userRecord._id,
        name: userRecord.name,
        imageUrl: userRecord.imageUrl,
        role: userRecord.role,
        plan: newPlan as any,
        isActive: userRecord.isActive,
      });
      toast.success("Subscription Plan Updated Successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update plan");
    } finally {
      setUpdatingId(null);
    }
  };

  if (!users || !stats) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-12 text-slate-500 font-semibold text-xs">
        <RefreshCwIcon className="animate-spin size-4 text-indigo-500" />
        Loading platform user directory...
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full">
      {/* ── 1. HERO HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
        {/* Glow Ambient Effect */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <UsersIcon className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  User Management & Role Access Control
                </h1>
                <Badge className="text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5">
                  RBAC Active
                </Badge>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1 max-w-2xl leading-relaxed">
                Manage platform user accounts, role-based access controls (RBAC), subscription tiers, and system security permissions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              onClick={() => setAddOpen(true)}
              className="h-9 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 shadow-md border-0"
            >
              <UserPlusIcon className="w-4 h-4 mr-1.5" /> Add User Account
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. TOP KPI METRICS GRID ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total System Users</p>
            <Badge variant="outline" className="text-[10px] font-bold border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5">
              <UsersIcon className="w-3 h-3 mr-1" /> All
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums mt-2">
            {stats.total}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Registered Platform Accounts</p>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Admins & Managers</p>
            <Badge className="text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 px-2 py-0.5">
              <CrownIcon className="w-3 h-3 mr-1" /> Executive
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums mt-2">
            {stats.adminCount + stats.managerCount}
          </p>
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">Full Management Privilege</p>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Staff & Suppliers</p>
            <Badge className="text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5">
              <UserCheckIcon className="w-3 h-3 mr-1" /> Staff
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 tabular-nums mt-2">
            {stats.staffCount + stats.supplierCount}
          </p>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1">Operational Role Access</p>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Accounts</p>
            <Badge className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5">
              <CheckCircleIcon className="w-3 h-3 mr-1" /> Active
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-2">
            {stats.activeCount}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
            {stats.total > 0 ? Math.round((stats.activeCount / stats.total) * 100) : 0}% Operational Rate
          </p>
        </Card>
      </div>

      {/* ── 3. MASTER USERS DIRECTORY CARD ── */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Platform Users Directory
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Displaying {filteredUsers.length} platform user records
              </CardDescription>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px]">
                <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-36 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="manager">Store Manager</SelectItem>
                  <SelectItem value="staff">Inventory Staff</SelectItem>
                  <SelectItem value="supplier">Vendor Supplier</SelectItem>
                  <SelectItem value="pending">Pending Approval</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 p-0">
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500 text-center">
              <UsersIcon className="w-10 h-10 text-indigo-500/40" />
              <p className="font-bold text-slate-900 dark:text-white">No Users Found</p>
              <p className="text-xs text-slate-500 max-w-sm">
                No platform users match your filter criteria. Try clearing search query or role filter.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddOpen(true)}
                className="rounded-xl text-xs font-semibold"
              >
                <UserPlusIcon className="w-3.5 h-3.5 mr-1" /> Add New User
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">User Identity</th>
                    <th className="px-5 py-3.5 font-bold">System Role</th>
                    <th className="px-5 py-3.5 font-bold hidden md:table-cell">Subscription Plan</th>
                    <th className="px-5 py-3.5 font-bold hidden lg:table-cell">Registered Date</th>
                    <th className="px-5 py-3.5 font-bold">Account Status</th>
                    <th className="px-5 py-3.5 font-bold text-right">RBAC Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredUsers.map((u) => {
                    const roleCfg = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.staff;
                    const RoleIcon = roleCfg.icon;
                    const isUpdating = updatingId === u._id;

                    return (
                      <tr
                        key={u._id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* User Identity */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {u.imageUrl ? (
                              <img
                                src={u.imageUrl}
                                alt={u.name}
                                className="size-9 rounded-lg object-cover border border-indigo-500/20 shadow-sm shrink-0"
                              />
                            ) : (
                              <div className="size-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/20 shrink-0">
                                {getInitials(u.name)}
                              </div>
                            )}
                            <div>
                              <button
                                onClick={() => router.push(`/users/${u._id}`)}
                                className="font-bold text-slate-900 dark:text-white text-sm hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline text-left transition-colors"
                              >
                                {u.name}
                              </button>
                              <p className="text-xs text-slate-500 font-medium">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* System Role */}
                        <td className="px-5 py-3.5">
                          <Badge className={`text-xs font-bold px-2.5 py-1 inline-flex items-center gap-1.5 border ${roleCfg.bg} ${roleCfg.color} ${roleCfg.border}`}>
                            {RoleIcon && <RoleIcon className="w-3.5 h-3.5" />}
                            <span>{roleCfg.label}</span>
                          </Badge>
                        </td>

                        {/* Subscription Plan */}
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <Select
                            value={u.plan ?? "starter"}
                            onValueChange={(val) => handlePlanChange(u, val)}
                            disabled={isUpdating}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800 capitalize">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="starter">Starter</SelectItem>
                              <SelectItem value="growth">Growth</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Registered Date */}
                        <td className="px-5 py-3.5 text-xs text-slate-500 font-medium hidden lg:table-cell">
                          {formatDate(u.createdAt)}
                        </td>

                        {/* Account Status */}
                        <td className="px-5 py-3.5">
                          <Badge className={`text-xs font-bold px-2.5 py-0.5 border ${
                            u.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700"
                          }`}>
                            {u.isActive ? "Active Account" : "Suspended"}
                          </Badge>
                        </td>

                        {/* RBAC Controls */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Detail Link */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => router.push(`/users/${u._id}`)}
                              className="h-8 text-xs font-semibold px-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <EyeIcon className="w-3.5 h-3.5 text-slate-400" />
                            </Button>

                            {/* Role Select Dropdown */}
                            <Select
                              value={u.role}
                              onValueChange={(val) => handleRoleChange(u, val)}
                              disabled={isUpdating}
                            >
                              <SelectTrigger className="w-32 h-8 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800">
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

                            {/* Status Toggle Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isUpdating}
                              onClick={() => handleStatusToggle(u, u.isActive)}
                              className={`h-8 text-xs px-3 rounded-xl font-bold border ${
                                u.isActive
                                  ? "text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/10"
                                  : "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"
                              }`}
                            >
                              {isUpdating ? (
                                <RefreshCwIcon className="animate-spin size-3.5" />
                              ) : u.isActive ? (
                                "Suspend"
                              ) : (
                                "Activate"
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddUserModal open={addOpen} onOpenChange={setAddOpen} />
      <EditUserModal user={selectedUser} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
