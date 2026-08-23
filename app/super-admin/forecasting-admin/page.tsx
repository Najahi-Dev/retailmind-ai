"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrainCircuit, Save, Activity, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export default function SuperAdminForecastingAdmin() {
  const { token } = useAuth();
  const settings = useQuery(api.aiOperationsAdmin.getAIOperationalSettings, { token: token ?? undefined });
  const updateSettings = useMutation(api.aiOperationsAdmin.updateAIOperationalSettings);

  const [formData, setFormData] = useState({
    forecastHorizonDays: 90,
    retrainingSchedule: "weekly",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        forecastHorizonDays: settings.forecastHorizonDays,
        retrainingSchedule: settings.retrainingSchedule,
      });
    }
  }, [settings]);

  if (!settings) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading AI Config...
      </div>
    );
  }

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      await updateSettings({
        token: token ?? undefined,
        updates: {
          forecastHorizonDays: formData.forecastHorizonDays,
          retrainingSchedule: formData.retrainingSchedule,
        }
      });
      toast.success("AI Forecasting configuration updated");
    } catch (e: any) {
      toast.error("Failed to update configuration");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">AI Forecasting Control Center</h1>
          <p className="text-indigo-200 mt-1">Manage global AI model parameters and training schedules for demand prediction.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-500" /> Model Configuration
            </CardTitle>
            <CardDescription>
              Set global boundaries for the RetailMind AI prediction engine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Global Forecast Horizon (Days)</label>
              <div className="text-xs text-muted-foreground mb-1">Maximum days into the future the AI will generate demand predictions.</div>
              <Input 
                type="number" 
                value={formData.forecastHorizonDays} 
                onChange={e => setFormData({ ...formData, forecastHorizonDays: Number(e.target.value) })} 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Model Retraining Schedule</label>
              <div className="text-xs text-muted-foreground mb-1">How often the core ML models are re-fitted with new historical data.</div>
              <Select value={formData.retrainingSchedule} onValueChange={(v) => setFormData({ ...formData, retrainingSchedule: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSave} disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700">
              <Save className="w-4 h-4 mr-2" /> Save Global Configuration
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" /> Training Fleet Status
            </CardTitle>
            <CardDescription>
              Status of distributed model training across tenant databases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg border flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">v2.4.1 Demand Model</div>
                  <div className="text-xs text-muted-foreground">Active Primary Model</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-600">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Training Healthy
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Avg. MAE</div>
                  <div className="text-xl font-bold">12.4%</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Confidence Score</div>
                  <div className="text-xl font-bold">94.1%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
