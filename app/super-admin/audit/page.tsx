"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, ShieldCheck, Database, Zap, HardDrive, KeyRound } from "lucide-react";

export default function SuperAdminAuditLogs() {
  const { token } = useAuth();
  const logs = useQuery(api.superAdmin.getAuditLogs, { token: token ?? undefined });

  if (!logs) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading Forensic Audit Trail...
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    if (action.includes("KILL")) return <Zap className="w-4 h-4 text-red-500" />;
    if (action.includes("USER")) return <KeyRound className="w-4 h-4 text-indigo-500" />;
    if (action.includes("TENANT")) return <Database className="w-4 h-4 text-amber-500" />;
    if (action.includes("IMPERSONATE")) return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
    return <HardDrive className="w-4 h-4 text-slate-500" />;
  };

  const getActionBadge = (action: string) => {
    if (action.includes("KILL_SWITCH")) return <Badge variant="destructive">{action}</Badge>;
    if (action.includes("IMPERSONATE")) return <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">{action}</Badge>;
    if (action.includes("UPDATE")) return <Badge variant="outline" className="text-amber-600 border-amber-500/30">{action}</Badge>;
    if (action.includes("CLONE")) return <Badge variant="outline" className="text-purple-600 border-purple-500/30">{action}</Badge>;
    return <Badge variant="outline">{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">System Audit Trail</h1>
          <p className="text-indigo-200 mt-1">Immutable forensic ledger of all privileged God-Mode actions.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" /> Platform Event Logs
          </CardTitle>
          <CardDescription>
            Chronological record of role changes, tenant cloning, impersonation, and kill switch activations.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[200px]">Action</TableHead>
                <TableHead>Target Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => (
                <TableRow key={log._id}>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      {getActionBadge(log.action)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.targetOrgName && <div><span className="font-semibold text-slate-700 dark:text-slate-300">Org:</span> {log.targetOrgName}</div>}
                    {log.targetUserName && <div><span className="font-semibold text-slate-700 dark:text-slate-300">User:</span> {log.targetUserName}</div>}
                    {!log.targetOrgName && !log.targetUserName && <span>Global</span>}
                  </TableCell>
                  <TableCell className="text-sm max-w-[400px] truncate">
                    {log.details}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No audit logs recorded yet.
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
