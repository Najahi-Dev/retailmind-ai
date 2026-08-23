"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, ArrowLeft, Clock, ShieldAlert, User, Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function JournalEntries() {
  const { token } = useAuth();
  const logs = useQuery(api.superAdmin.getAuditLogs, { token: token ?? undefined });

  if (!logs) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-muted-foreground gap-4">
        <Activity className="animate-spin w-8 h-8 text-indigo-600" />
        <p className="font-medium animate-pulse">Loading Journal Entries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <Link href="/super-admin">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Journal</h1>
          <p className="text-muted-foreground mt-1">Complete history of platform activities and security events.</p>
        </div>
      </div>
      
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Displaying the latest {logs.length} journal entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-0 md:before:translate-x-5 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
            {logs.map((log: any) => {
              const date = new Date(log.timestamp);
              
              let Icon = Activity;
              let iconColor = "text-indigo-500";
              let iconBg = "bg-indigo-50 dark:bg-indigo-950";
              let badgeColor = "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300";

              if (log.action.includes("KILL_SWITCH") || log.action.includes("OVERRIDE") || log.action.includes("DEACTIVATE")) {
                Icon = ShieldAlert;
                iconColor = "text-red-500";
                iconBg = "bg-red-50 dark:bg-red-950";
                badgeColor = "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
              } else if (log.targetOrgId) {
                Icon = Building2;
                iconColor = "text-emerald-500";
                iconBg = "bg-emerald-50 dark:bg-emerald-950";
                badgeColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300";
              } else if (log.targetUserId) {
                Icon = User;
                iconColor = "text-blue-500";
                iconBg = "bg-blue-50 dark:bg-blue-950";
                badgeColor = "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
              }

              return (
                <div key={log._id} className="relative flex items-start gap-6 group">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-950 ${iconBg} shadow-sm shrink-0 z-10`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  <div className="flex-1 pb-6 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${badgeColor}`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                          <span className="font-semibold text-sm">{log.targetName}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-sm">
                          {log.details || 'No additional details provided.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="w-3.5 h-3.5" />
                        {date.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
