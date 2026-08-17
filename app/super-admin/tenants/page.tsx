"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LogIn, Ban, CheckCircle, Activity, Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SuperAdminTenants() {
  const { token, impersonateUser } = useAuth();
  const router = useRouter();
  
  const orgs = useQuery(api.superAdmin.getAllOrganizations, { token: token ?? undefined });
  const generateImpersonationToken = useMutation(api.superAdmin.generateImpersonationToken);
  const updateOrganizationStatus = useMutation(api.superAdmin.updateOrganizationStatus);

  const handleImpersonate = async (ownerId: string) => {
    try {
      const result = await generateImpersonationToken({ token: token ?? undefined, targetUserId: ownerId as any });
      impersonateUser(result.token);
      toast.success(`Impersonating ${result.user.name}`);
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to impersonate");
    }
  };

  const handleToggleStatus = async (orgId: string, currentStatus: string) => {
    const newStatus = currentStatus === "CANCELED" ? "ACTIVE" : "CANCELED";
    try {
      await updateOrganizationStatus({ 
        token: token ?? undefined, 
        orgId: orgId as any,
        updates: { subscriptionStatus: newStatus as any }
      });
      toast.success(`Organization status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  if (!orgs) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Activity className="animate-spin w-6 h-6 text-indigo-500 mr-2" />
        Loading Tenants...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Tenant & Organization Control</h1>
        <p className="text-slate-400 text-sm mt-1">Manage all supermarket client accounts, override plans, or safely impersonate owners.</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-slate-900/50">
                <TableHead className="text-slate-400">Organization</TableHead>
                <TableHead className="text-slate-400">Owner</TableHead>
                <TableHead className="text-slate-400">Plan</TableHead>
                <TableHead className="text-slate-400">Users</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-right text-slate-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org: any) => (
                <TableRow key={org._id} className="border-slate-800 hover:bg-slate-800/50">
                  <TableCell>
                    <div className="font-medium text-slate-200">{org.name}</div>
                    <div className="text-xs text-slate-500">/{org.slug}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-300">{org.ownerName || "Unknown"}</div>
                    <div className="text-xs text-slate-500">{org.ownerEmail}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10 uppercase text-[10px]">
                      {org.planTier || "STARTER"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {org.userCount}
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      org.subscriptionStatus === "ACTIVE" || org.subscriptionStatus === "TRIALING"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }>
                      {org.subscriptionStatus || "FREE"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10"
                        title="Impersonate Owner"
                        onClick={() => org.ownerId && handleImpersonate(org.ownerId)}
                        disabled={!org.ownerId}
                      >
                        <LogIn className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className={`h-8 px-2 ${org.subscriptionStatus === "CANCELED" ? "text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10" : "text-red-500 hover:text-red-400 hover:bg-red-500/10"}`}
                        title={org.subscriptionStatus === "CANCELED" ? "Activate" : "Suspend"}
                        onClick={() => handleToggleStatus(org._id, org.subscriptionStatus)}
                      >
                        {org.subscriptionStatus === "CANCELED" ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {orgs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No organizations found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
