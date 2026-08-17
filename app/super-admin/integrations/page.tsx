"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plug, Key, Search, Unplug, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export default function SuperAdminIntegrations() {
  const { token } = useAuth();
  const integrations = useQuery(api.workflowAdmin.getPlatformIntegrations, { token: token ?? undefined });
  const toggleStatus = useMutation(api.workflowAdmin.toggleIntegrationStatus);
  const [searchTerm, setSearchTerm] = useState("");

  if (integrations === undefined) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading Integrations...</div>;
  }

  const filtered = integrations.filter((i: any) => 
    i.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.orgId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = async (id: any, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "disconnected" : "active";
      await toggleStatus({ token: token ?? undefined, integrationId: id, status: newStatus as any });
      toast.success(`Integration ${newStatus}`);
    } catch (e: any) {
      toast.error("Failed to update integration");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Integration Center</h1>
          <p className="text-indigo-200 mt-1">Manage global webhooks, ERP connections, and API keys across all tenants.</p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
            <Plug className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">Platform Connections</h3>
            <p className="text-sm text-muted-foreground">Monitor the health of third-party systems connected to RetailMind AI.</p>
          </div>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search provider or tenant..."
            className="pl-8 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-lg">
            No integrations found.
          </div>
        ) : (
          filtered.map((integration: any) => (
            <Card key={integration._id} className={integration.status === "disconnected" ? "opacity-75" : ""}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="capitalize text-lg">{integration.provider}</CardTitle>
                  <Badge variant={
                    integration.status === "active" ? "default" :
                    integration.status === "error" ? "destructive" : "secondary"
                  }>
                    {integration.status}
                  </Badge>
                </div>
                <CardDescription className="text-xs font-mono mt-1">Tenant: {integration.orgId}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Connected On:</span>
                    <span>{new Date(integration.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Sync:</span>
                    <span>{integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : "Never"}</span>
                  </div>
                </div>
                <div className="pt-3 border-t">
                  <div className="text-xs font-medium mb-2 flex items-center gap-1">
                    <Key className="w-3 h-3" /> Credentials Status
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {integration.status === "active" ? "Securely vaulted and validated." : "Authentication blocked or missing."}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  variant={integration.status === "active" ? "outline" : "default"} 
                  className="w-full"
                  onClick={() => handleToggle(integration._id, integration.status)}
                >
                  {integration.status === "active" ? (
                    <><Unplug className="w-4 h-4 mr-2" /> Disconnect</>
                  ) : (
                    <><CheckCircle className="w-4 h-4 mr-2" /> Reconnect</>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
