"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plug, Key, Search, Unplug, CheckCircle, Webhook, Plus, Trash2, KeyRound, Copy, Check, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

export default function SuperAdminIntegrations() {
  const { token } = useAuth();
  
  // Queries
  const integrations = useQuery(api.workflowAdmin.getPlatformIntegrations, { token: token ?? undefined });
  const webhooks = useQuery(api.workflowAdmin.getWebhooks, { token: token ?? undefined });
  const apiKeys = useQuery(api.workflowAdmin.getApiKeys, { token: token ?? undefined });

  // Mutations
  const toggleStatus = useMutation(api.workflowAdmin.toggleIntegrationStatus);
  const createWebhook = useMutation(api.workflowAdmin.createWebhook);
  const toggleWebhook = useMutation(api.workflowAdmin.toggleWebhook);
  const deleteWebhook = useMutation(api.workflowAdmin.deleteWebhook);
  const createApiKey = useAction(api.workflowAdmin.createApiKey);
  const revokeApiKey = useMutation(api.workflowAdmin.revokeApiKey);

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState("po.created, price.drop");
  
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Connection Handlers
  const filteredConnections = integrations?.filter((i: any) => 
    i.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.orgId.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleToggleConnection = async (id: any, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "disconnected" : "active";
      await toggleStatus({ token: token ?? undefined, integrationId: id, status: newStatus as any });
      toast.success(`Integration ${newStatus}`);
    } catch (e: any) {
      toast.error("Failed to update integration");
    }
  };

  // Webhook Handlers
  const handleCreateWebhook = async () => {
    try {
      if (!newWebhookUrl) return toast.error("Webhook URL is required");
      const events = newWebhookEvents.split(",").map(e => e.trim()).filter(Boolean);
      await createWebhook({
        token: token ?? undefined,
        url: newWebhookUrl,
        secret: `whsec_${Math.random().toString(36).substring(2, 15)}`,
        events
      });
      toast.success("Webhook created successfully");
      setIsWebhookModalOpen(false);
      setNewWebhookUrl("");
    } catch (e: any) {
      toast.error("Failed to create webhook");
    }
  };

  // API Key Handlers
  const handleCreateApiKey = async () => {
    try {
      if (!newKeyName) return toast.error("Key name is required");
      const result = await createApiKey({
        token: token ?? undefined,
        name: newKeyName,
      });
      setGeneratedKey(result.rawKey);
      toast.success("API Key generated");
    } catch (e: any) {
      toast.error("Failed to generate API Key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  if (integrations === undefined) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading Integration Center...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Integration Center</h1>
          <p className="text-indigo-200 mt-1">Manage global webhooks, ERP connections, and API keys across all tenants.</p>
        </div>
      </div>

      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:max-w-md w-[95vw] sm:w-full">
          <TabsTrigger value="connections" className="flex items-center gap-2"><Plug className="size-4"/> ERP & POS</TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2"><Webhook className="size-4"/> Webhooks</TabsTrigger>
          <TabsTrigger value="apikeys" className="flex items-center gap-2"><KeyRound className="size-4"/> API Keys</TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* TAB: ERP CONNECTIONS                                     */}
        {/* ======================================================== */}
        <TabsContent value="connections" className="mt-6 space-y-4">
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
            {filteredConnections.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                No connections found.
              </div>
            ) : (
              filteredConnections.map((integration: any) => (
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
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button 
                      variant={integration.status === "active" ? "outline" : "default"} 
                      className="w-full"
                      onClick={() => handleToggleConnection(integration._id, integration.status)}
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
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB: GLOBAL WEBHOOKS                                     */}
        {/* ======================================================== */}
        <TabsContent value="webhooks" className="mt-6 space-y-4">
          <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                <Webhook className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Global Webhooks</h3>
                <p className="text-sm text-muted-foreground">Manage endpoints receiving real-time platform events.</p>
              </div>
            </div>
            <Button onClick={() => setIsWebhookModalOpen(true)}>
              <Plus className="size-4 mr-2" /> Add Endpoint
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!webhooks?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No webhooks configured.</TableCell>
                  </TableRow>
                ) : (
                  webhooks.map((wh) => (
                    <TableRow key={wh._id}>
                      <TableCell className="font-mono text-sm max-w-[200px] truncate" title={wh.url}>{wh.url}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {wh.events.map(ev => <Badge key={ev} variant="secondary" className="text-xs">{ev}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(wh.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Switch 
                          checked={wh.isActive} 
                          onCheckedChange={(checked) => {
                            toggleWebhook({ token: token ?? undefined, webhookId: wh._id, isActive: checked })
                              .then(() => toast.success(`Webhook ${checked ? "activated" : "paused"}`))
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => {
                            deleteWebhook({ token: token ?? undefined, webhookId: wh._id })
                              .then(() => toast.success("Webhook deleted"))
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB: API KEYS                                            */}
        {/* ======================================================== */}
        <TabsContent value="apikeys" className="mt-6 space-y-4">
          <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Global API Keys</h3>
                <p className="text-sm text-muted-foreground">Generate and revoke API keys for programmatic system access.</p>
              </div>
            </div>
            <Button onClick={() => setIsKeyModalOpen(true)}>
              <Plus className="size-4 mr-2" /> Generate New Key
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Fragment</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!apiKeys?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No API keys found.</TableCell>
                  </TableRow>
                ) : (
                  apiKeys.map((k) => (
                    <TableRow key={k._id} className={!k.isActive ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{k.name}</TableCell>
                      <TableCell className="font-mono text-sm">{k.keyMasked}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(k.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {k.isActive ? (
                          <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Revoked</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {k.isActive && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-500 hover:text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => {
                              revokeApiKey({ token: token ?? undefined, keyId: k._id })
                                .then(() => toast.success("API Key revoked"))
                            }}
                          >
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

      </Tabs>

      {/* --- Webhook Modal --- */}
      <Dialog open={isWebhookModalOpen} onOpenChange={setIsWebhookModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Global Webhook</DialogTitle>
            <DialogDescription>Configure a new endpoint to receive real-time JSON payloads for platform events.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Endpoint URL</label>
              <Input 
                placeholder="https://api.example.com/webhooks" 
                value={newWebhookUrl} 
                onChange={(e) => setNewWebhookUrl(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Events to Subscribe (comma separated)</label>
              <Input 
                placeholder="po.created, price.drop, tenant.registered" 
                value={newWebhookEvents} 
                onChange={(e) => setNewWebhookEvents(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWebhookModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateWebhook}>Create Endpoint</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- API Key Modal --- */}
      <Dialog 
        open={isKeyModalOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setGeneratedKey(null);
            setNewKeyName("");
          }
          setIsKeyModalOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{generatedKey ? "Key Generated Successfully" : "Generate Global API Key"}</DialogTitle>
            <DialogDescription>
              {generatedKey 
                ? "Please copy this key now. For security reasons, you won't be able to see it again." 
                : "Create a new API key for programmatic access to the entire platform. Treat this key like a password."}
            </DialogDescription>
          </DialogHeader>
          
          {generatedKey ? (
            <div className="py-6">
              <div className="flex items-center space-x-2 bg-muted p-3 rounded-lg border">
                <code className="flex-1 font-mono text-sm break-all">{generatedKey}</code>
                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(generatedKey)}>
                  {copiedKey ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Key Name</label>
                <Input 
                  placeholder="e.g., Zapier Integration, ERP Sync Script" 
                  value={newKeyName} 
                  onChange={(e) => setNewKeyName(e.target.value)} 
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {generatedKey ? (
              <Button onClick={() => setIsKeyModalOpen(false)} className="w-full">I have copied my key</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsKeyModalOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateApiKey}>Generate Key</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
