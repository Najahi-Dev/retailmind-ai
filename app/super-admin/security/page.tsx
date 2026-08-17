"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Activity, ShieldAlert, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function SuperAdminSecurity() {
  const { token } = useAuth();
  const settings = useQuery(api.superAdmin.getGlobalSettings, { token: token ?? undefined });
  const toggleMaintenanceMode = useMutation(api.superAdmin.toggleMaintenanceMode);
  
  const [isUpdating, setIsUpdating] = useState(false);

  if (!settings) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Activity className="animate-spin w-6 h-6 text-indigo-500 mr-2" />
        Loading Global Settings...
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Platform Security & Global Controls</h1>
        <p className="text-slate-400 text-sm mt-1">Manage platform-wide settings, maintenance modes, and feature flags.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" /> System Maintenance Mode
            </CardTitle>
            <CardDescription className="text-slate-400">
              When enabled, the frontend will be placed into a read-only or maintenance screen for all normal users. Only Super Admins can access the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800">
              <div className="space-y-0.5">
                <Label htmlFor="maintenance-mode" className="text-white text-base font-medium">
                  Enable Maintenance Mode
                </Label>
                <div className="text-sm text-slate-400">
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
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3 text-amber-400 text-sm">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                  <strong>Warning:</strong> The application is currently in maintenance mode. Customers cannot log in or make changes. Be sure to disable this when migrations or updates are complete.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-500" /> Global Feature Flags
            </CardTitle>
            <CardDescription className="text-slate-400">
              Enable or disable specific platform features globally.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800">
              <div className="space-y-0.5">
                <Label className="text-white font-medium">AI Demand Forecasting</Label>
                <div className="text-xs text-slate-500">Allow users to generate AI forecasts.</div>
              </div>
              <Switch checked={true} disabled />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800">
              <div className="space-y-0.5">
                <Label className="text-white font-medium">Batch CSV Imports</Label>
                <div className="text-xs text-slate-500">Allow users to import inventory via CSV.</div>
              </div>
              <Switch checked={true} disabled />
            </div>

            <Button variant="outline" disabled className="w-full border-slate-700 text-slate-400">
              Save Feature Flags
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
