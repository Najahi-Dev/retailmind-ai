"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfirm } from "@/hooks/use-confirm";
import { ArrowLeft, Users, Activity, Copy, CheckCircle, Ban, Pencil, Trash2, UserPlus } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";

export default function SuperAdminTenantDetails() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId as string;
  
  const orgDetails = useQuery(api.superAdmin.getOrganizationDetails, { 
    token: token ?? undefined,
    orgId: orgId as any,
  });

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
    isActive: true,
    sendEmail: true,
  });

  const addTenantUser = useAction(api.superAdminActions.addTenantUser);
  const updateTenantUser = useMutation(api.usersAdmin.updateTenantUser);
  const deleteTenantUser = useMutation(api.usersAdmin.deleteTenantUser);

  const [ConfirmDialog, confirm] = useConfirm(
    "Delete User",
    "Are you sure you want to permanently delete this user? This action cannot be undone.",
    "danger"
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addTenantUser({
        token: token!,
        orgId: orgId as any,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });

      if (formData.sendEmail) {
        toast.promise(
          fetch("/api/send-credentials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: formData.email,
              name: formData.name,
              password: formData.password,
              role: formData.role,
            }),
          }).then((res) => {
            if (!res.ok) throw new Error("Email dispatch failed");
            return res.json();
          }),
          {
            loading: "Creating user & sending email...",
            success: "User added & email sent successfully!",
            error: "User added, but failed to send email.",
          }
        );
      } else {
        toast.success("User added successfully");
      }
      setIsAddUserOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add user");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateTenantUser({
        token: token!,
        userId: editUser._id,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive,
      });
      toast.success("User updated successfully");
      setIsEditUserOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update user");
    }
  };

  const handleDelete = async (userId: string) => {
    const ok = await confirm();
    if (ok) {
      try {
        await deleteTenantUser({ token: token!, userId: userId as any });
        toast.success("User deleted successfully");
      } catch (err: any) {
        toast.error(err.message || "Failed to delete user");
      }
    }
  };

  const openEdit = (user: any) => {
    setEditUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      isActive: user.isActive,
    });
    setIsEditUserOpen(true);
  };

  if (orgDetails === undefined) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Activity className="animate-spin w-6 h-6 text-indigo-500 mr-2" />
        Loading Organization Details...
      </div>
    );
  }

  if (orgDetails === null) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <h2 className="text-xl font-bold mb-2">Organization Not Found</h2>
        <p className="text-muted-foreground mb-4">The organization you are looking for does not exist or you don't have access.</p>
        <Button onClick={() => router.push("/super-admin/tenants")}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/super-admin/tenants")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{orgDetails.name}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            /{orgDetails.slug}
            <Button variant="ghost" size="icon" className="h-4 w-4 opacity-50 hover:opacity-100 p-0" onClick={() => {
              navigator.clipboard.writeText(orgDetails._id);
              toast.success("Org ID copied");
            }}>
              <Copy className="h-3 w-3" />
            </Button>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Badge className={
              orgDetails.subscriptionStatus === "ACTIVE" || orgDetails.subscriptionStatus === "TRIALING"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
            }>
              {orgDetails.subscriptionStatus || "FREE"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Plan Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 uppercase text-xs">
              {orgDetails.planTier || "STARTER"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            {orgDetails.userCount}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500"/> Workspace Users
            </CardTitle>
            <CardDescription>All user accounts associated with this organization.</CardDescription>
          </div>
          <Button size="sm" onClick={() => {
            setFormData({ name: "", email: "", password: "", role: "staff", isActive: true, sendEmail: true });
            setIsAddUserOpen(true);
          }}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead>User Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgDetails.users?.map((user: any) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{user.role.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleDelete(user._id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!orgDetails.users || orgDetails.users.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found in this organization.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Modal */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Workspace User</DialogTitle>
            <DialogDescription>Create a new user for {orgDetails.name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <Input type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={r => setFormData({ ...formData, role: r })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="manager">Store Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="sendEmail" 
                checked={formData.sendEmail} 
                onCheckedChange={(checked) => setFormData({ ...formData, sendEmail: checked as boolean })} 
              />
              <Label htmlFor="sendEmail" className="font-normal cursor-pointer">
                Send credentials via email to the user
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
              <Button type="submit">Create User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update details for {editUser?.email}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={r => setFormData({ ...formData, role: r })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="manager">Store Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Switch checked={formData.isActive} onCheckedChange={checked => setFormData({ ...formData, isActive: checked })} />
              <Label>Active Account</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditUserOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
}
