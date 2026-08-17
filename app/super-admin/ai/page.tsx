"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Activity, BrainCircuit, DollarSign, Bot, Save } from "lucide-react";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SuperAdminAITelemetry() {
  const { token } = useAuth();
  
  const telemetry = useQuery(api.telemetry.getAiTelemetry, { token: token ?? undefined });
  const systemPrompts = useQuery(api.systemPrompts.getSystemPrompts, { token: token ?? undefined });
  const saveSystemPrompt = useMutation(api.systemPrompts.saveSystemPrompt);

  const [editingPrompt, setEditingPrompt] = useState<any>(null);

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrompt) return;
    
    try {
      await saveSystemPrompt({
        token: token ?? undefined,
        id: editingPrompt._id,
        name: editingPrompt.name,
        description: editingPrompt.description || "",
        systemPrompt: editingPrompt.systemPrompt,
        userPromptTemplate: editingPrompt.userPromptTemplate || "",
        defaultModel: editingPrompt.defaultModel,
        fallbackModel: editingPrompt.fallbackModel || "",
        isActive: editingPrompt.isActive,
      });
      toast.success("Prompt saved successfully");
      setEditingPrompt(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save prompt");
    }
  };

  const handleNewPrompt = () => {
    setEditingPrompt({
      name: "NEW_PROMPT",
      description: "",
      systemPrompt: "You are an AI...",
      defaultModel: "gemini-1.5-pro",
      fallbackModel: "gemini-1.5-flash",
      isActive: true,
    });
  };

  if (!telemetry || !systemPrompts) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Activity className="animate-spin w-6 h-6 text-indigo-500 mr-2" />
        Loading AI Telemetry...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">AI Telemetry & Governance</h1>
          <p className="text-indigo-200 mt-1">Track LLM spend, token usage, and manage system prompts globally.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AI Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${telemetry.metrics.totalCost.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">Estimated API Spend</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Processed</CardTitle>
            <BrainCircuit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{telemetry.metrics.totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Input & Output</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{telemetry.metrics.totalCalls}</div>
            <p className="text-xs text-muted-foreground">Total inferences logged</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Prompt Registry</CardTitle>
            <CardDescription>Manage and tune AI prompts without code deploys.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={handleNewPrompt} size="sm" variant="outline" className="w-full">
                + Create New Prompt
              </Button>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {systemPrompts.map((p) => (
                      <TableRow key={p._id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>
                          <Badge variant={p.isActive ? "default" : "secondary"}>
                            {p.isActive ? "Active" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setEditingPrompt(p)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {systemPrompts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No prompts found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {editingPrompt && (
          <Card className="border-indigo-500/20 shadow-lg dark:shadow-none">
            <CardHeader className="bg-indigo-50/50 dark:bg-indigo-900/10 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-500" />
                Prompt Playground
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSavePrompt} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prompt Name</Label>
                    <Input 
                      value={editingPrompt.name} 
                      onChange={e => setEditingPrompt({...editingPrompt, name: e.target.value})}
                      disabled={!!editingPrompt._id}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Default Model</Label>
                    <Input 
                      value={editingPrompt.defaultModel} 
                      onChange={e => setEditingPrompt({...editingPrompt, defaultModel: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>System Prompt (Master Instructions)</Label>
                  <Textarea 
                    value={editingPrompt.systemPrompt} 
                    onChange={e => setEditingPrompt({...editingPrompt, systemPrompt: e.target.value})}
                    className="min-h-[150px] font-mono text-sm"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Switch 
                    checked={editingPrompt.isActive}
                    onCheckedChange={checked => setEditingPrompt({...editingPrompt, isActive: checked})}
                  />
                  <Label>Active</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setEditingPrompt(null)}>Cancel</Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                    <Save className="w-4 h-4 mr-2" /> Save Prompt
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
