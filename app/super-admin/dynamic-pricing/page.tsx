"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CircleDollarSign, Save, ShieldAlert, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export default function SuperAdminDynamicPricing() {
  const { token } = useAuth();
  const settings = useQuery(api.aiOperationsAdmin.getAIOperationalSettings, { token: token ?? undefined });
  const updateSettings = useMutation(api.aiOperationsAdmin.updateAIOperationalSettings);

  const [formData, setFormData] = useState({
    globalMinProfitMarginPercent: 15,
    globalMaxDiscountPercent: 50,
    globalMaxDailyPriceChangePercent: 10,
    requireApprovalForHighRisk: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        globalMinProfitMarginPercent: settings.globalMinProfitMarginPercent,
        globalMaxDiscountPercent: settings.globalMaxDiscountPercent,
        globalMaxDailyPriceChangePercent: settings.globalMaxDailyPriceChangePercent,
        requireApprovalForHighRisk: settings.requireApprovalForHighRisk,
      });
    }
  }, [settings]);

  if (!settings) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading Pricing Guardrails...
      </div>
    );
  }

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      await updateSettings({
        token: token ?? undefined,
        updates: {
          globalMinProfitMarginPercent: formData.globalMinProfitMarginPercent,
          globalMaxDiscountPercent: formData.globalMaxDiscountPercent,
          globalMaxDailyPriceChangePercent: formData.globalMaxDailyPriceChangePercent,
          requireApprovalForHighRisk: formData.requireApprovalForHighRisk,
        }
      });
      toast.success("Pricing guardrails updated successfully");
    } catch (e: any) {
      toast.error("Failed to update pricing rules");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Dynamic Pricing Administration</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure global business guardrails to prevent AI from making dangerous pricing decisions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-500" /> Safety Guardrails
            </CardTitle>
            <CardDescription>
              Hard limits that apply to all AI price recommendations across all tenants.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Global Minimum Profit Margin (%)</label>
              <div className="text-xs text-muted-foreground mb-1">AI will never recommend a price that drops the margin below this value.</div>
              <Input 
                type="number" 
                value={formData.globalMinProfitMarginPercent} 
                onChange={e => setFormData({ ...formData, globalMinProfitMarginPercent: Number(e.target.value) })} 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Global Maximum Discount (%)</label>
              <div className="text-xs text-muted-foreground mb-1">The maximum allowable discount from the base selling price.</div>
              <Input 
                type="number" 
                value={formData.globalMaxDiscountPercent} 
                onChange={e => setFormData({ ...formData, globalMaxDiscountPercent: Number(e.target.value) })} 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Maximum Daily Price Change (%)</label>
              <div className="text-xs text-muted-foreground mb-1">To prevent price shock, limit how much a price can change in 24 hours.</div>
              <Input 
                type="number" 
                value={formData.globalMaxDailyPriceChangePercent} 
                onChange={e => setFormData({ ...formData, globalMaxDailyPriceChangePercent: Number(e.target.value) })} 
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md bg-muted/20 mt-4">
              <div className="space-y-0.5">
                <span className="text-sm font-medium">Require Approval for High-Risk Changes</span>
                <p className="text-xs text-muted-foreground">Route changes exceeding 15% to the Approval Center.</p>
              </div>
              <Switch checked={formData.requireApprovalForHighRisk} onCheckedChange={c => setFormData({ ...formData, requireApprovalForHighRisk: c })} />
            </div>

            <Button onClick={handleSave} disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 mt-4">
              <Save className="w-4 h-4 mr-2" /> Enforce Guardrails
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" /> Real-Time Pricing Impact
            </CardTitle>
            <CardDescription>
              Platform-wide statistics on AI pricing interventions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Active Interventions</div>
                  <div className="text-xl font-bold">1,245</div>
                  <div className="text-xs text-emerald-500 mt-1">+12% vs last week</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Avg Margin Impact</div>
                  <div className="text-xl font-bold">+2.4%</div>
                  <div className="text-xs text-emerald-500 mt-1">Healthy</div>
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg border mt-4">
                <h4 className="font-semibold text-sm mb-2">Recent Guardrail Blocks</h4>
                <div className="space-y-2">
                  <div className="text-xs flex justify-between">
                    <span className="text-muted-foreground">Tenant A: -25% Drop</span>
                    <span className="text-red-500 font-medium">Blocked (Max Change)</span>
                  </div>
                  <div className="text-xs flex justify-between">
                    <span className="text-muted-foreground">Tenant D: Margin 5%</span>
                    <span className="text-red-500 font-medium">Blocked (Min Margin)</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
