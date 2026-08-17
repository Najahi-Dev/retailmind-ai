"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BellRing, Edit, Save, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";

export default function SuperAdminNotifications() {
  const { token } = useAuth();
  const templates = useQuery(api.communicationsAdmin.getTemplates, { token: token ?? undefined });
  const saveTemplate = useMutation(api.communicationsAdmin.saveTemplate);
  const toggleTemplate = useMutation(api.communicationsAdmin.toggleTemplateStatus);

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    channel: "email" as any,
    subjectTemplate: "",
    bodyTemplate: "",
    isActive: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (templates === undefined) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading Templates...</div>;
  }

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      await saveTemplate({
        token: token ?? undefined,
        ...formData
      });
      toast.success("Template saved successfully");
      setIsOpen(false);
      setFormData({ name: "", channel: "email", subjectTemplate: "", bodyTemplate: "", isActive: true });
    } catch (e: any) {
      toast.error(e.message || "Failed to save template");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Notification Templates</h1>
          <p className="text-indigo-200 mt-1">Manage platform-wide SMS, Email, and In-App notification templates.</p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" /> Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Configure Notification Template</DialogTitle>
              <DialogDescription>Use double curly braces for variables (e.g., {"{{tenantName}}"}, {"{{poNumber}}"}).</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Template Key</label>
                  <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} placeholder="e.g. BILLING_FAILED" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Channel</label>
                  <Select value={formData.channel} onValueChange={(val: any) => setFormData({ ...formData, channel: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="in_app">In-App Push</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {formData.channel === "email" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject Template</label>
                  <Input value={formData.subjectTemplate} onChange={e => setFormData({ ...formData, subjectTemplate: e.target.value })} placeholder="Action Required: Payment Failed" />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Body Template</label>
                <Textarea 
                  rows={5}
                  value={formData.bodyTemplate} 
                  onChange={e => setFormData({ ...formData, bodyTemplate: e.target.value })} 
                  placeholder="Hello {{userName}}, your subscription..."
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-md">
                <span className="text-sm font-medium">Active Status</span>
                <Switch checked={formData.isActive} onCheckedChange={c => setFormData({ ...formData, isActive: c })} />
              </div>

              <Button onClick={handleSave} disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" /> Save Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((tpl: any) => (
          <Card key={tpl._id} className={!tpl.isActive ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-indigo-500" /> {tpl.name}
                </CardTitle>
                <Badge variant={tpl.isActive ? "default" : "secondary"}>
                  {tpl.channel.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {tpl.channel === "email" && (
                <div className="text-sm">
                  <span className="font-semibold text-muted-foreground">Subject: </span>
                  {tpl.subjectTemplate}
                </div>
              )}
              <div className="p-3 bg-muted/30 border rounded-md text-sm font-mono whitespace-pre-wrap">
                {tpl.bodyTemplate}
              </div>
              
              <div className="pt-4 flex justify-between items-center border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Switch 
                    checked={tpl.isActive} 
                    onCheckedChange={async (c) => {
                      try {
                        await toggleTemplate({ token: token ?? undefined, templateId: tpl._id, isActive: c });
                        toast.success("Status updated");
                      } catch(e) {
                        toast.error("Failed to update status");
                      }
                    }} 
                  />
                  <span>Active</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setFormData({
                    name: tpl.name,
                    channel: tpl.channel,
                    subjectTemplate: tpl.subjectTemplate || "",
                    bodyTemplate: tpl.bodyTemplate,
                    isActive: tpl.isActive
                  });
                  setIsOpen(true);
                }}>
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-lg">
            No notification templates defined yet.
          </div>
        )}
      </div>
    </div>
  );
}
