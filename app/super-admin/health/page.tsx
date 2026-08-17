"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, Info, XCircle, Megaphone, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SuperAdminHealth() {
  const { token } = useAuth();
  const alerts = useQuery(api.superAdmin.getSystemAlerts, { token: token ?? undefined });
  const banners = useQuery(api.superAdmin.getSystemBanners, { token: token ?? undefined });
  const createBanner = useMutation(api.superAdmin.createSystemBanner);
  const toggleBanner = useMutation(api.superAdmin.toggleSystemBanner);

  const [newBannerMsg, setNewBannerMsg] = useState("");
  const [newBannerType, setNewBannerType] = useState<"info"|"warning"|"error">("info");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!alerts || !banners) {
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

  const handleCreateBanner = async () => {
    if (!newBannerMsg) return;
    try {
      setIsSubmitting(true);
      await createBanner({
        token: token ?? undefined,
        message: newBannerMsg,
        type: newBannerType
      });
      toast.success("Global banner created!");
      setNewBannerMsg("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create banner");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Health & Fleet Engine</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time stream of server-side errors and Global Announcements.</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Megaphone className="w-4 h-4 mr-2" /> Push Global Banner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Broadcast Global Announcement</DialogTitle>
              <DialogDescription>
                This message will appear at the top of every user's dashboard across all organizations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Input 
                  value={newBannerMsg} 
                  onChange={e => setNewBannerMsg(e.target.value)} 
                  placeholder="e.g. Scheduled maintenance in 1 hour..." 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Banner Type</label>
                <Select value={newBannerType} onValueChange={(v: any) => setNewBannerType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info (Blue)</SelectItem>
                    <SelectItem value="warning">Warning (Amber)</SelectItem>
                    <SelectItem value="error">Critical (Red)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateBanner} className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={!newBannerMsg || isSubmitting}>
                Publish Banner
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-indigo-500" /> Active Global Banners
            </CardTitle>
            <CardDescription>
              Manage announcements currently visible to all tenants.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[500px]">
            <div className="space-y-3">
              {banners.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                  No active banners.
                </div>
              ) : (
                banners.map((banner: any) => (
                  <div key={banner._id} className={`p-4 rounded-lg border flex items-center justify-between ${!banner.isActive ? 'opacity-50' : ''}`}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {banner.type === 'error' && <Badge className="bg-red-500">Critical</Badge>}
                        {banner.type === 'warning' && <Badge className="bg-amber-500">Warning</Badge>}
                        {banner.type === 'info' && <Badge className="bg-blue-500">Info</Badge>}
                      </div>
                      <p className="text-sm font-medium mt-1">{banner.message}</p>
                      <p className="text-xs text-muted-foreground">{new Date(banner.createdAt).toLocaleString()}</p>
                    </div>
                    <Switch 
                      checked={banner.isActive} 
                      onCheckedChange={async (val) => {
                        try {
                          await toggleBanner({ token: token ?? undefined, bannerId: banner._id, isActive: val });
                          toast.success(val ? "Banner activated" : "Banner disabled");
                        } catch (e) {
                          toast.error("Failed to toggle banner");
                        }
                      }}
                    />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" /> Live Error Stream
            </CardTitle>
            <CardDescription>
              Recent entries from the systemAlerts table.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[500px]">
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
    </div>
  );
}
