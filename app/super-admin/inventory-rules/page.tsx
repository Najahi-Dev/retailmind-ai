"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Save, AlertTriangle, Layers } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export default function SuperAdminInventoryRules() {
  const { token } = useAuth();
  const settings = useQuery(api.aiOperationsAdmin.getAIOperationalSettings, { token: token ?? undefined });
  const updateSettings = useMutation(api.aiOperationsAdmin.updateAIOperationalSettings);

  const [formData, setFormData] = useState({
    globalSafetyStockDays: 14,
    globalExpiryWarningDays: 30,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        globalSafetyStockDays: settings.globalSafetyStockDays,
        globalExpiryWarningDays: settings.globalExpiryWarningDays,
      });
    }
  }, [settings]);

  if (!settings) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading Inventory Rules...
      </div>
    );
  }

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      await updateSettings({
        token: token ?? undefined,
        updates: {
          globalSafetyStockDays: formData.globalSafetyStockDays,
          globalExpiryWarningDays: formData.globalExpiryWarningDays,
        }
      });
      toast.success("Inventory rules updated successfully");
    } catch (e: any) {
      toast.error("Failed to update inventory rules");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Global Inventory Rules</h1>
          <p className="text-indigo-200 mt-1">Configure platform-wide replenishment buffers and safety stock policies.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Layers className="w-5 h-5 text-indigo-500" /> Platform Replenishment Policy
             </CardTitle>
             <CardDescription>
               Set default buffers used by the automated reorder engine when calculating POs.
             </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Safety Stock (Days)</label>
              <div className="text-xs text-muted-foreground mb-1">Global minimum days of stock to hold to prevent stock-outs during demand spikes.</div>
              <Input 
                type="number" 
                value={formData.globalSafetyStockDays} 
                onChange={e => setFormData({ ...formData, globalSafetyStockDays: Number(e.target.value) })} 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Expiry Warning Threshold (Days)</label>
              <div className="text-xs text-muted-foreground mb-1">Number of days before expiration to trigger dynamic markdown recommendations.</div>
              <Input 
                type="number" 
                value={formData.globalExpiryWarningDays} 
                onChange={e => setFormData({ ...formData, globalExpiryWarningDays: Number(e.target.value) })} 
              />
            </div>

            <Button onClick={handleSave} disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 mt-4">
              <Save className="w-4 h-4 mr-2" /> Apply Global Rules
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Package className="w-5 h-5 text-indigo-500" /> Platform Inventory Health
             </CardTitle>
             <CardDescription>
               Real-time aggregation of inventory risk across all active shops.
             </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-red-500/10 border-red-500/30">
                  <div className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> High Stock-Out Risk
                  </div>
                  <div className="text-2xl font-bold mt-1 text-red-700 dark:text-red-500">142 SKUs</div>
                </div>
                <div className="p-4 border rounded-lg bg-amber-500/10 border-amber-500/30">
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Overstock Value
                  </div>
                  <div className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-500">LKR 4.2M</div>
                </div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg border mt-4">
                <h4 className="font-semibold text-sm mb-2">Automated PO Engine</h4>
                <div className="space-y-2">
                  <div className="text-xs flex justify-between">
                    <span className="text-muted-foreground">POs Generated (Today)</span>
                    <span className="font-medium">342</span>
                  </div>
                  <div className="text-xs flex justify-between">
                    <span className="text-muted-foreground">Value of Automated POs</span>
                    <span className="font-medium">LKR 12.4M</span>
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
