"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, Info, XCircle } from "lucide-react";

export default function SuperAdminHealth() {
  const { token } = useAuth();
  const alerts = useQuery(api.superAdmin.getSystemAlerts, { token: token ?? undefined });

  if (!alerts) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Activity className="animate-spin w-6 h-6 text-indigo-500 mr-2" />
        Loading System Telemetry...
      </div>
    );
  }

  const getAlertIcon = (level: string) => {
    switch (level) {
      case "error":
      case "critical":
        return <XCircle className="w-5 h-5 text-red-500 mt-0.5" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />;
      default:
        return <Info className="w-5 h-5 text-blue-500 mt-0.5" />;
    }
  };

  const getAlertBadge = (level: string) => {
    switch (level) {
      case "critical":
        return <Badge className="bg-red-600">Critical</Badge>;
      case "error":
        return <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30">Error</Badge>;
      case "warning":
        return <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">Warning</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30">Info</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Health & Telemetry</h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time stream of server-side errors, webhook failures, and database spikes.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" /> Live Error Stream
          </CardTitle>
          <CardDescription>
            Recent entries from the systemAlerts table.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                No system alerts or errors recorded. The system is healthy.
              </div>
            ) : (
              alerts.map((alert: any) => (
                <div key={alert._id} className="flex gap-4 p-4 rounded-lg bg-card border items-start">
                  {getAlertIcon(alert.level)}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{alert.message}</span>
                      {getAlertBadge(alert.level)}
                      <Badge variant="outline" className="text-muted-foreground">
                        {alert.source}
                      </Badge>
                    </div>
                    {alert.details && (
                      <p className="text-sm text-muted-foreground bg-muted p-2 rounded border mt-2 font-mono text-xs">
                        {alert.details}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
