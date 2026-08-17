"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Activity, ShieldAlert, AlertCircle, Skull, Search, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SuperAdminSecurity() {
  const { token } = useAuth();
  
  const settings = useQuery(api.superAdmin.getGlobalSettings, { token: token ?? undefined });
  const orgs = useQuery(api.superAdmin.getAllOrganizations, { token: token ?? undefined });
  const securityEvents = useQuery(api.superAdmin.getSecurityEvents, { token: token ?? undefined });
  
  const toggleMaintenanceMode = useMutation(api.superAdmin.toggleMaintenanceMode);
  const globalKillSwitch = useMutation(api.superAdmin.globalKillSwitch);
  const resolveSecurityEvent = useMutation(api.superAdmin.resolveSecurityEvent);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [killOrgId, setKillOrgId] = useState("");
  const [killReason, setKillReason] = useState("");

  if (!settings || !orgs || !securityEvents) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Activity className="animate-spin w-6 h-6 text-indigo-500 mr-2" />
        Loading Security Operations Center...
      </div>
    );
  }

  const handleMaintenanceToggle = async (checked: boolean) => {
    try {
      setIsUpdating(true);
      await toggleMaintenanceMode({ token: token ?? undefined, enabled: checked });
      toast.success(checked ? "Maintenance mode enabled. All non-admin traffic will be blocked." : "Maintenance mode disabled.");
    } catch (error: any) {
      toast.error(error.message || "Failed to update maintenance mode");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKillSwitch = async () => {
    if (!killOrgId || !killReason) {
      toast.error("Please provide an organization and a reason.");
      return;
    }
    
    try {
      setIsUpdating(true);
      const res = await globalKillSwitch({
        token: token ?? undefined,
        targetOrgId: killOrgId as any,
        reason: killReason,
      });
      toast.success(`Kill switch activated! Revoked ${res.revokedCount} active sessions.`);
      setKillOrgId("");
      setKillReason("");
    } catch (error: any) {
      toast.error(error.message || "Failed to execute kill switch");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResolveEvent = async (id: any) => {
    try {
      await resolveSecurityEvent({ token: token ?? undefined, eventId: id });
      toast.success("Security event marked as resolved.");
    } catch (error: any) {
      toast.error("Failed to resolve event");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security Operations Center (SOC)</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage global security, kill switches, and investigate anomalous activities.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Skull className="w-5 h-5 text-red-500" /> Global Kill Switch
            </CardTitle>
            <CardDescription>
              Instantly revoke all active JWT/Sessions for an organization in case of a breach or compliance violation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 p-4 border border-red-500/20 bg-red-50/50 dark:bg-red-950/20 rounded-lg">
              <div className="space-y-2">
                <Label className="text-red-600 dark:text-red-400 font-bold">Target Organization</Label>
                <Select value={killOrgId} onValueChange={setKillOrgId}>
                  <SelectTrigger className="border-red-500/30">
                    <SelectValue placeholder="Select tenant to lockdown..." />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs.map((org: any) => (
                      <SelectItem key={org._id} value={org._id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-red-600 dark:text-red-400 font-bold">Reason for Lockdown (Required)</Label>
                <Input 
                  value={killReason}
                  onChange={e => setKillReason(e.target.value)}
                  placeholder="e.g. Account compromised, Legal compliance" 
                  className="border-red-500/30"
                />
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full font-bold" disabled={!killOrgId || !killReason || isUpdating}>
                    <ShieldAlert className="w-4 h-4 mr-2" /> EXECUTE LOCKDOWN
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-red-600">CONFIRM GLOBAL KILL SWITCH</DialogTitle>
                    <DialogDescription>
                      This action will immediately terminate ALL active user sessions for the selected organization.
                      Are you absolutely sure you want to proceed?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-3 mt-4">
                    <Button variant="outline">Cancel</Button>
                    <Button variant="destructive" onClick={handleKillSwitch}>Yes, Terminate Sessions</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" /> System Maintenance Mode
            </CardTitle>
            <CardDescription>
              Place the frontend into a read-only or maintenance screen for all normal users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
              <div className="space-y-0.5">
                <Label htmlFor="maintenance-mode" className="text-base font-medium">
                  Enable Maintenance Mode
                </Label>
                <div className="text-sm text-muted-foreground">
                  Currently {settings.maintenanceMode ? <span className="text-amber-500 font-bold">Active</span> : <span className="text-emerald-500 font-bold">Disabled</span>}
                </div>
              </div>
              <Switch
                id="maintenance-mode"
                checked={settings.maintenanceMode}
                onCheckedChange={handleMaintenanceToggle}
                disabled={isUpdating}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
            
            {settings.maintenanceMode && (
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3 text-amber-600 text-sm">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                  <strong>Warning:</strong> The application is currently in maintenance mode. Customers cannot log in or make changes. Be sure to disable this when migrations or updates are complete.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Forensic Event Logs</CardTitle>
          <CardDescription>
            Audit trail of high-severity security operations (Kill Switches, Anomalies).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {securityEvents.map((evt: any) => (
                <TableRow key={evt._id} className={evt.resolved ? "opacity-50" : ""}>
                  <TableCell className="text-sm">
                    {new Date(evt.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {evt.eventType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-sm truncate">
                    {evt.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant={evt.severity === "critical" ? "destructive" : "secondary"}>
                      {evt.severity.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {!evt.resolved ? (
                      <Button size="sm" variant="ghost" onClick={() => handleResolveEvent(evt._id)} className="text-emerald-600">
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Resolve
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground mr-4">Resolved</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {securityEvents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No security events found.
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
