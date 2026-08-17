"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function SuperAdminUsers() {
  const { token } = useAuth();
  const users = useQuery(api.usersAdmin.getAllPlatformUsers, { token: token ?? undefined });
  
  const updateUserRole = useMutation(api.usersAdmin.updateUserRole);
  const toggleUserStatus = useMutation(api.usersAdmin.toggleUserStatus);

  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);

  if (!users) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading Global Users...
      </div>
    );
  }

  const handleRoleChange = async (userId: any, newRole: string) => {
    try {
      setRoleUpdatingId(userId);
      await updateUserRole({ token: token ?? undefined, userId, newRole });
      toast.success("User role updated successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to update role");
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const handleStatusToggle = async (userId: any, currentStatus: boolean) => {
    try {
      await toggleUserStatus({ token: token ?? undefined, userId, isActive: !currentStatus });
      toast.success(!currentStatus ? "User activated" : "User deactivated (sessions revoked)");
    } catch (e: any) {
      toast.error(e.message || "Failed to toggle status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Identity & Access Management</h1>
          <p className="text-indigo-200 mt-1">Manage users, roles, and access across all tenants globally.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" /> Platform Users Directory
          </CardTitle>
          <CardDescription>
            A consolidated view of every user registered on RetailMind AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User / Email</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>System Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: any) => (
                <TableRow key={user._id} className={!user.isActive ? "opacity-60 bg-muted/30" : ""}>
                  <TableCell>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.orgName}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select 
                      disabled={roleUpdatingId === user._id}
                      value={user.role} 
                      onValueChange={(val) => handleRoleChange(user._id, val)}
                    >
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="admin">Shop Owner</SelectItem>
                        <SelectItem value="manager">Branch Manager</SelectItem>
                        <SelectItem value="staff">Sales Staff</SelectItem>
                        <SelectItem value="supplier">Supplier</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Active</Badge>
                    ) : (
                      <Badge variant="destructive">Suspended</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleStatusToggle(user._id, user.isActive)}
                      className={user.isActive ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"}
                    >
                      {user.isActive ? (
                        <><ShieldAlert className="w-4 h-4 mr-2" /> Revoke</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4 mr-2" /> Restore</>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
