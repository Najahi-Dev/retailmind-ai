"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogIn, Ban, CheckCircle, Activity, Copy, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SuperAdminTenants() {
  const { token, impersonateUser } = useAuth();
  const router = useRouter();
  
  const orgs = useQuery(api.superAdmin.getAllOrganizations, { token: token ?? undefined });
  const generateImpersonationToken = useMutation(api.superAdmin.generateImpersonationToken);
  const updateOrganizationStatus = useMutation(api.superAdmin.updateOrganizationStatus);
  const cloneTenantDatabase = useMutation(api.superAdmin.cloneTenantDatabase);
  
  const [isUpdating, setIsUpdating] = useState(false);

  // Limits Modal State
  const [limitsOrg, setLimitsOrg] = useState<any>(null);
  const [maxSkus, setMaxSkus] = useState("1000");
  const [maxApi, setMaxApi] = useState("10000");
  const [maxBranches, setMaxBranches] = useState("1");

  const handleImpersonate = async (ownerId: string) => {
    const reason = window.prompt("Security Audit: Please enter the reason for impersonating this tenant:");
    if (!reason) return;

    try {
      const result = await generateImpersonationToken({ 
        token: token ?? undefined, 
        targetUserId: ownerId as any,
        reason 
      });
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

  const handleCloneTenant = async (sourceOrgId: string) => {
    const targetOrgId = window.prompt("Enter the exact ID of the Target Organization you want to clone data into:");
    if (!targetOrgId) return;

    if (!window.confirm("Are you sure? This will dump the source org's demo data into the target org.")) return;

    try {
      setIsUpdating(true);
      await cloneTenantDatabase({
        token: token ?? undefined,
        sourceOrgId: sourceOrgId as any,
        targetOrgId: targetOrgId as any,
      });
      toast.success("Tenant data cloned successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to clone tenant");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveLimits = async () => {
    if (!limitsOrg) return;
    try {
      setIsUpdating(true);
      await updateOrganizationStatus({
        token: token ?? undefined,
        orgId: limitsOrg._id as any,
        updates: {
          limits: {
            maxSkus: parseInt(maxSkus) || 1000,
            maxApi: parseInt(maxApi) || 10000,
            maxBranches: parseInt(maxBranches) || 1,
          } as any
        }
      });
      toast.success("Organization limits updated!");
      setLimitsOrg(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update limits");
    } finally {
      setIsUpdating(false);
    }
  };

  const openLimitsModal = (org: any) => {
    setLimitsOrg(org);
    setMaxSkus(org.limits?.maxSkus?.toString() || "1000");
    setMaxApi(org.limits?.maxApi?.toString() || "10000");
    setMaxBranches(org.limits?.maxBranches?.toString() || "1");
  };

  if (!orgs) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Activity className="animate-spin w-6 h-6 text-indigo-500 mr-2" />
        Loading Tenants...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Tenant & Organization Control</h1>
          <p className="text-indigo-200 mt-1">Manage all supermarket client accounts, override plans, or safely impersonate owners.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Limits / Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org: any) => (
                <TableRow key={org._id}>
                  <TableCell>
                    <div className="font-medium flex items-center gap-2">
                      {org.name}
                      <Button variant="ghost" size="icon" className="h-4 w-4 opacity-50 hover:opacity-100" onClick={() => {
                        navigator.clipboard.writeText(org._id);
                        toast.success("Org ID copied");
                      }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">/{org.slug}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{org.ownerName || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">{org.ownerEmail}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 uppercase text-[10px]">
                      {org.planTier || "STARTER"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <div className="font-medium text-slate-700 dark:text-slate-300">{org.userCount} Users</div>
                    <div className="text-xs">
                      SKUs: {org.limits?.maxSkus || "Default"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      org.subscriptionStatus === "ACTIVE" || org.subscriptionStatus === "TRIALING"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                    }>
                      {org.subscriptionStatus || "FREE"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-2 text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10"
                        title="Impersonate Owner (Requires Audit Reason)"
                        onClick={() => org.ownerId && handleImpersonate(org.ownerId)}
                        disabled={!org.ownerId}
                      >
                        <LogIn className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-2 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10"
                        title="Override Quotas & Limits"
                        onClick={() => openLimitsModal(org)}
                      >
                        <Settings2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-2 text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/10"
                        title="Clone Demo Data from this Org"
                        onClick={() => handleCloneTenant(org._id)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className={`h-8 px-2 ${org.subscriptionStatus === "CANCELED" ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10" : "text-red-600 dark:text-red-400 hover:bg-red-500/10"}`}
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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No organizations found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!limitsOrg} onOpenChange={(open) => !open && setLimitsOrg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Tenant Quotas</DialogTitle>
            <DialogDescription>
              Adjust granular limits for <strong>{limitsOrg?.name}</strong>. These bypass standard plan defaults.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Max SKUs</Label>
              <Input type="number" value={maxSkus} onChange={e => setMaxSkus(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max API Requests / Day</Label>
              <Input type="number" value={maxApi} onChange={e => setMaxApi(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max Branches / Warehouses</Label>
              <Input type="number" value={maxBranches} onChange={e => setMaxBranches(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLimitsOrg(null)}>Cancel</Button>
            <Button onClick={handleSaveLimits} disabled={isUpdating}>Save Overrides</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
