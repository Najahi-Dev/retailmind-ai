"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BellRing, Edit, Save, Plus, Mail, MessageSquare, Smartphone, CheckCircle2, Copy, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState, useMemo } from "react";

export default function SuperAdminNotifications() {
  const { token } = useAuth();
  const templates = useQuery(api.communicationsAdmin.getTemplates, { token: token ?? undefined });
  const saveTemplate = useMutation(api.communicationsAdmin.saveTemplate);
  const toggleTemplate = useMutation(api.communicationsAdmin.toggleTemplateStatus);
  const deleteTemplate = useMutation(api.communicationsAdmin.deleteTemplate);
  const sendTestEmail = useAction(api.communications.sendTemplateTestEmail);

  const [isOpen, setIsOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    channel: "email" as any,
    subjectTemplate: "",
    bodyTemplate: "",
    isActive: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived state
  const stats = useMemo(() => {
    if (!templates) return { total: 0, email: 0, sms: 0, in_app: 0 };
    return {
      total: templates.length,
      email: templates.filter((t: any) => t.channel === "email" && t.isActive).length,
      sms: templates.filter((t: any) => t.channel === "sms" && t.isActive).length,
      in_app: templates.filter((t: any) => t.channel === "in_app" && t.isActive).length,
    };
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (activeTab === "all") return templates;
    return templates.filter((t: any) => t.channel === activeTab);
  }, [templates, activeTab]);

  if (templates === undefined) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading Templates...</div>;
  }

  const handleSave = async () => {
    if (!formData.name || !formData.bodyTemplate) {
      return toast.error("Template Name and Body are required.");
    }
    try {
      setIsSubmitting(true);
      await saveTemplate({
        token: token ?? undefined,
        ...formData
      });
      toast.success("Template saved successfully");
      setIsOpen(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message || "Failed to save template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestEmail = async () => {
    if (!formData.name) return toast.error("Please save the template first before testing.");
    try {
      setIsTesting(true);
      toast.loading("Sending test email...", { id: "test-email" });
      
      await sendTestEmail({
        token: token ?? undefined,
        templateName: formData.name, // Sent to the signed-in super admin's own e-mail
        variables: {
          userName: "Test User",
          tenantName: "Acme Corp",
          poNumber: "PO-9999",
          amount: "$150.00",
          link: "https://retailmind.ai/dashboard"
        }
      });
      
      toast.success("Test email sent successfully! Check your inbox.", { id: "test-email" });
    } catch (error: any) {
      toast.error(error.message || "Failed to send test email.", { id: "test-email" });
    } finally {
      setIsTesting(false);
    }
  };

  const confirmDelete = async (templateId: string) => {
    try {
      await deleteTemplate({ token: token ?? undefined, templateId: templateId as any });
      toast.success("Template deleted successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete template");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", channel: "email", subjectTemplate: "", bodyTemplate: "", isActive: true });
  };

  const openEdit = (tpl: any) => {
    setFormData({
      name: tpl.name,
      channel: tpl.channel,
      subjectTemplate: tpl.subjectTemplate || "",
      bodyTemplate: tpl.bodyTemplate,
      isActive: tpl.isActive
    });
    setIsOpen(true);
  };

  // Helper for live preview variables highlighting
  const renderPreviewText = (text: string) => {
    if (!text) return <span className="text-muted-foreground italic">Template body goes here...</span>;
    // Simple regex to split by {{variable}} and wrap in a highlighted span
    const parts = text.split(/(\{\{[^}]+\}\})/g);
    return parts.map((part, i) => {
      if (part.startsWith("{{") && part.endsWith("}}")) {
        return <span key={i} className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-1 rounded mx-0.5 font-mono text-xs font-semibold">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Notification Templates</h1>
          <p className="text-indigo-200 mt-1">Manage platform-wide SMS, Email, and In-App notification templates.</p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            onClick={() => { resetForm(); setIsOpen(true); }}
          >
            <Plus className="w-4 h-4 mr-2" /> Create Template
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-full text-slate-600 dark:text-slate-400">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Templates</p>
              <h3 className="text-2xl font-bold">{stats.total}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Emails</p>
              <h3 className="text-2xl font-bold">{stats.email}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active SMS</p>
              <h3 className="text-2xl font-bold">{stats.sms}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active In-App</p>
              <h3 className="text-2xl font-bold">{stats.in_app}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex justify-between items-center border-b pb-2">
          <TabsList className="bg-transparent space-x-2 p-0 h-auto">
            <TabsTrigger value="all" className="data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-full px-4">All Channels</TabsTrigger>
            <TabsTrigger value="email" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/30 dark:data-[state=active]:text-blue-400 rounded-full px-4"><Mail className="w-3.5 h-3.5 mr-2" /> Email</TabsTrigger>
            <TabsTrigger value="sms" className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700 dark:data-[state=active]:bg-emerald-900/30 dark:data-[state=active]:text-emerald-400 rounded-full px-4"><MessageSquare className="w-3.5 h-3.5 mr-2" /> SMS</TabsTrigger>
            <TabsTrigger value="in_app" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700 dark:data-[state=active]:bg-amber-900/30 dark:data-[state=active]:text-amber-400 rounded-full px-4"><Smartphone className="w-3.5 h-3.5 mr-2" /> In-App</TabsTrigger>
          </TabsList>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((tpl: any) => (
            <Card key={tpl._id} className={`group hover:shadow-md transition-all ${!tpl.isActive ? 'opacity-60 grayscale-[0.5]' : ''}`}>
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wide">
                      {tpl.channel === "email" && <Mail className="w-4 h-4 text-blue-500" />}
                      {tpl.channel === "sms" && <MessageSquare className="w-4 h-4 text-emerald-500" />}
                      {tpl.channel === "in_app" && <Smartphone className="w-4 h-4 text-amber-500" />}
                      {tpl.name}
                    </CardTitle>
                    {tpl.channel === "email" && (
                      <CardDescription className="text-xs truncate max-w-[200px]" title={tpl.subjectTemplate}>
                        Subj: {tpl.subjectTemplate}
                      </CardDescription>
                    )}
                  </div>
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
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 bg-muted/10 h-[100px] overflow-hidden text-sm text-slate-600 dark:text-slate-300 relative border-b">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white dark:to-slate-950 pointer-events-none"></div>
                  {renderPreviewText(tpl.bodyTemplate)}
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the <strong>{tpl.name}</strong> notification template from the system.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => confirmDelete(tpl._id)} className="bg-red-600 hover:bg-red-700 text-white">
                          Delete Template
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  <Button variant="ghost" size="sm" onClick={() => openEdit(tpl)} className="h-8 text-xs font-semibold">
                    <Edit className="w-3.5 h-3.5 mr-2" /> Edit Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredTemplates.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/20">
              <BellRing className="w-12 h-12 mb-3 opacity-20" />
              <p>No notification templates found in this category.</p>
              <Button variant="outline" className="mt-4" onClick={() => { resetForm(); setIsOpen(true); }}>
                Create your first template
              </Button>
            </div>
          )}
        </div>
      </Tabs>

      {/* --- Split-Pane Editor Dialog --- */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-5xl w-[95vw] h-[85vh] p-0 overflow-hidden flex flex-col gap-0 rounded-xl">
          <DialogHeader className="p-4 border-b bg-slate-50 dark:bg-slate-900 shrink-0">
            <DialogTitle className="text-xl">
              {formData.name ? `Editing Template: ${formData.name}` : "Create New Template"}
            </DialogTitle>
            <DialogDescription>
              Configure your template on the left and see a live simulated preview on the right.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 flex overflow-hidden">
            {/* Left Pane: Configuration */}
            <div className="w-1/2 flex flex-col border-r bg-white dark:bg-slate-950 overflow-y-auto">
              <div className="p-6 space-y-6 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">Template Key <span className="text-red-500">*</span></label>
                    <Input 
                      value={formData.name} 
                      onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase().replace(/\s+/g, '_') })} 
                      placeholder="e.g. ORDER_CONFIRMED" 
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">Delivery Channel <span className="text-red-500">*</span></label>
                    <Select value={formData.channel} onValueChange={(val: any) => setFormData({ ...formData, channel: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email"><div className="flex items-center gap-2"><Mail className="w-4 h-4"/> Email</div></SelectItem>
                        <SelectItem value="sms"><div className="flex items-center gap-2"><MessageSquare className="w-4 h-4"/> SMS</div></SelectItem>
                        <SelectItem value="in_app"><div className="flex items-center gap-2"><Smartphone className="w-4 h-4"/> In-App Push</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {formData.channel === "email" && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">Subject Line <span className="text-red-500">*</span></label>
                    <Input 
                      value={formData.subjectTemplate} 
                      onChange={e => setFormData({ ...formData, subjectTemplate: e.target.value })} 
                      placeholder="Action Required: Payment Failed" 
                    />
                  </div>
                )}

                <div className="space-y-2 flex-1 flex flex-col min-h-[300px]">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">Body Template <span className="text-red-500">*</span></label>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Supports {"{{variables}}"}</span>
                  </div>
                  <Textarea 
                    className="flex-1 resize-none font-mono text-sm leading-relaxed p-4 bg-slate-50 dark:bg-slate-900 border-dashed focus-visible:ring-indigo-500"
                    value={formData.bodyTemplate} 
                    onChange={e => setFormData({ ...formData, bodyTemplate: e.target.value })} 
                    placeholder="Hello {{userName}},\n\nYour recent order {{poNumber}} has been confirmed."
                  />
                  <div className="flex flex-wrap gap-2 pt-2">
                    {['{{userName}}', '{{tenantName}}', '{{poNumber}}', '{{amount}}', '{{link}}'].map(v => (
                      <Badge 
                        key={v} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-indigo-100 hover:text-indigo-700 font-mono text-xs font-normal"
                        onClick={() => setFormData({...formData, bodyTemplate: formData.bodyTemplate + v})}
                      >
                        {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-4 border-t bg-slate-50 dark:bg-slate-900 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3 bg-white dark:bg-slate-950 px-3 py-1.5 rounded-full border shadow-sm">
                  <Switch id="active-status" checked={formData.isActive} onCheckedChange={c => setFormData({ ...formData, isActive: c })} />
                  <label htmlFor="active-status" className="text-xs font-bold uppercase tracking-wide cursor-pointer select-none">
                    {formData.isActive ? <span className="text-emerald-600">Active</span> : <span className="text-slate-400">Draft</span>}
                  </label>
                </div>
                <Button onClick={handleSave} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 w-32">
                  <Save className="w-4 h-4 mr-2" /> {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            {/* Right Pane: Live Visual Preview */}
            <div className="w-1/2 bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-8 overflow-y-auto relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
              
              {/* LIVE PREVIEW TAG */}
              <div className="absolute top-4 right-4 bg-white/80 dark:bg-black/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase border flex items-center gap-2 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Preview
              </div>

              {/* SMS PREVIEW */}
              {formData.channel === "sms" && (
                <div className="w-[300px] h-[600px] bg-black rounded-[40px] border-[8px] border-slate-800 p-4 shadow-2xl relative flex flex-col justify-end pb-8">
                  <div className="absolute top-0 inset-x-0 h-6 flex justify-center">
                    <div className="w-32 h-6 bg-slate-800 rounded-b-xl"></div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <div className="bg-[#0B93F6] text-white p-3 px-4 rounded-2xl rounded-br-sm text-[15px] leading-snug shadow-sm max-w-[250px] break-words whitespace-pre-wrap">
                      {renderPreviewText(formData.bodyTemplate)}
                    </div>
                    <div className="text-[10px] text-slate-500 mr-1 mt-1 font-semibold">Delivered</div>
                  </div>
                </div>
              )}

              {/* EMAIL PREVIEW */}
              {formData.channel === "email" && (
                <div className="w-full max-w-[450px] bg-white dark:bg-slate-950 rounded-xl border shadow-xl overflow-hidden flex flex-col">
                  {/* Email Header Chrome */}
                  <div className="bg-slate-100 dark:bg-slate-900 border-b p-3 flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  </div>
                  <div className="border-b p-4 space-y-2 text-sm bg-white dark:bg-slate-950">
                    <div className="flex text-slate-500">
                      <span className="w-16">To:</span> 
                      <span className="text-slate-900 dark:text-slate-100">{renderPreviewText("{{userEmail}}")}</span>
                    </div>
                    <div className="flex text-slate-500">
                      <span className="w-16">From:</span> 
                      <span className="font-semibold text-slate-900 dark:text-slate-100">notifications@retailmind.ai</span>
                    </div>
                    <div className="flex text-slate-500 items-start">
                      <span className="w-16 shrink-0 mt-0.5">Subject:</span> 
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {renderPreviewText(formData.subjectTemplate)}
                      </span>
                    </div>
                  </div>
                  {/* Email Body */}
                  <div className="p-6 bg-slate-50 dark:bg-black min-h-[300px]">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded border shadow-sm max-w-[400px] mx-auto text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                      {renderPreviewText(formData.bodyTemplate)}
                      <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                        <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded opacity-50"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Test Action */}
                  <div className="p-3 border-t bg-slate-50 dark:bg-slate-900 flex justify-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-xs font-semibold"
                      onClick={handleTestEmail}
                      disabled={isTesting || !formData.name}
                    >
                      <Mail className="w-3.5 h-3.5 mr-2 text-blue-500" /> 
                      {isTesting ? "Sending..." : "Send Test Email to me"}
                    </Button>
                  </div>
                </div>
              )}

              {/* IN-APP PREVIEW */}
              {formData.channel === "in_app" && (
                <div className="w-[350px] bg-white dark:bg-slate-800 rounded-xl border shadow-2xl p-4 flex gap-4 transform transition-all hover:scale-105">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                    <BellRing className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">RetailMind Alert</p>
                      <span className="text-[10px] text-muted-foreground">Just now</span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap line-clamp-3">
                      {renderPreviewText(formData.bodyTemplate)}
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
