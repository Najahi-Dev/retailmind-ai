"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, PackageSearch, Save, Info } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function SuperAdminPlans() {
  const { token } = useAuth();
  const plans = useQuery(api.plansAdmin.getPlans, { token: token ?? undefined });
  const createPlan = useMutation(api.plansAdmin.createPlan);
  const updatePlan = useMutation(api.plansAdmin.updatePlan);

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    tier: "STARTER" as any,
    description: "",
    monthlyPriceLkr: 0,
    yearlyPriceLkr: 0,
    isRecommended: false,
    activeSkuLimit: 100,
    storeLimit: 1,
    staffUserLimit: 2,
    aiDemandForecasting: false,
    automatedReorder: false,
    dynamicPricing: false,
    supplierPortal: false,
    fullRbac: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!plans) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading Subscription Plans...
      </div>
    );
  }

  const handleCreate = async () => {
    try {
      setIsSubmitting(true);
      await createPlan({
        token: token ?? undefined,
        name: formData.name,
        tier: formData.tier,
        description: formData.description,
        monthlyPriceLkr: formData.monthlyPriceLkr,
        yearlyPriceLkr: formData.yearlyPriceLkr,
        isRecommended: formData.isRecommended,
        features: {
          activeSkuLimit: formData.activeSkuLimit === -1 ? "unlimited" : formData.activeSkuLimit,
          storeLimit: formData.storeLimit === -1 ? "unlimited" : formData.storeLimit,
          staffUserLimit: formData.staffUserLimit === -1 ? "unlimited" : formData.staffUserLimit,
          aiDemandForecasting: formData.aiDemandForecasting,
          automatedReorder: formData.automatedReorder,
          dynamicPricing: formData.dynamicPricing,
          supplierPortal: formData.supplierPortal,
          fullRbac: formData.fullRbac,
        }
      });
      toast.success("Plan created successfully!");
      setIsOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to create plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscription Plan Builder</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure entitlements, usage limits, and monetization plans.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Create New Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configure Subscription Plan</DialogTitle>
              <DialogDescription>
                Set pricing and feature entitlements. Limits set to -1 will be treated as "unlimited".
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Plan Name</label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Starter" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Plan Tier</label>
                <Select value={formData.tier} onValueChange={(val: any) => setFormData({ ...formData, tier: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STARTER">Starter</SelectItem>
                    <SelectItem value="GROWTH">Growth</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Monthly Price (LKR)</label>
                <Input type="number" value={formData.monthlyPriceLkr} onChange={e => setFormData({ ...formData, monthlyPriceLkr: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Yearly Price (LKR)</label>
                <Input type="number" value={formData.yearlyPriceLkr} onChange={e => setFormData({ ...formData, yearlyPriceLkr: Number(e.target.value) })} />
              </div>
              
              <div className="col-span-2 border-t mt-4 pt-4 mb-2"><h4 className="font-semibold text-sm">Usage Limits</h4></div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Active SKU Limit</label>
                <Input type="number" value={formData.activeSkuLimit} onChange={e => setFormData({ ...formData, activeSkuLimit: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Store/Branch Limit</label>
                <Input type="number" value={formData.storeLimit} onChange={e => setFormData({ ...formData, storeLimit: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Staff User Limit</label>
                <Input type="number" value={formData.staffUserLimit} onChange={e => setFormData({ ...formData, staffUserLimit: Number(e.target.value) })} />
              </div>

              <div className="col-span-2 border-t mt-4 pt-4 mb-2"><h4 className="font-semibold text-sm">Feature Entitlements</h4></div>

              <div className="flex items-center justify-between p-3 border rounded-md">
                <span className="text-sm font-medium">AI Demand Forecasting</span>
                <Switch checked={formData.aiDemandForecasting} onCheckedChange={c => setFormData({ ...formData, aiDemandForecasting: c })} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <span className="text-sm font-medium">Automated Reorder</span>
                <Switch checked={formData.automatedReorder} onCheckedChange={c => setFormData({ ...formData, automatedReorder: c })} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <span className="text-sm font-medium">AI Dynamic Pricing</span>
                <Switch checked={formData.dynamicPricing} onCheckedChange={c => setFormData({ ...formData, dynamicPricing: c })} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <span className="text-sm font-medium">Supplier Portal</span>
                <Switch checked={formData.supplierPortal} onCheckedChange={c => setFormData({ ...formData, supplierPortal: c })} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <span className="text-sm font-medium">Full RBAC Delegation</span>
                <Switch checked={formData.fullRbac} onCheckedChange={c => setFormData({ ...formData, fullRbac: c })} />
              </div>

              <div className="col-span-2 mt-4">
                <Button onClick={handleCreate} className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isSubmitting}>
                  <Save className="w-4 h-4 mr-2" /> Save Subscription Plan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan: any) => (
          <Card key={plan._id} className={!plan.isActive ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="flex items-center gap-2">
                  <PackageSearch className="w-5 h-5 text-indigo-500" /> {plan.name}
                </CardTitle>
                <Badge variant={plan.isActive ? "default" : "secondary"}>
                  {plan.isActive ? "Active" : "Archived"}
                </Badge>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-end border-b pb-4">
                <div>
                  <div className="text-2xl font-bold">LKR {plan.monthlyPriceLkr.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">/ month</div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SKU Limit</span>
                  <span className="font-medium">{plan.features.activeSkuLimit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Store Limit</span>
                  <span className="font-medium">{plan.features.storeLimit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staff Limit</span>
                  <span className="font-medium">{plan.features.staffUserLimit}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                {plan.features.aiDemandForecasting && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <Info className="w-4 h-4" /> AI Demand Forecasting
                  </div>
                )}
                {plan.features.automatedReorder && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <Info className="w-4 h-4" /> Automated Replenishment
                  </div>
                )}
                {plan.features.dynamicPricing && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <Info className="w-4 h-4" /> AI Dynamic Pricing
                  </div>
                )}
                {plan.features.supplierPortal && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <Info className="w-4 h-4" /> Enterprise Supplier Portal
                  </div>
                )}
              </div>

              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={async () => {
                  try {
                    await updatePlan({ token: token ?? undefined, planId: plan._id, updates: { isActive: !plan.isActive } });
                    toast.success(plan.isActive ? "Plan archived" : "Plan activated");
                  } catch (e: any) {
                    toast.error("Failed to update plan");
                  }
                }}
              >
                {plan.isActive ? "Archive Plan" : "Restore Plan"}
              </Button>
            </CardContent>
          </Card>
        ))}

        {plans.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
            <PackageSearch className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-1">No Subscription Plans Found</h3>
            <p className="text-sm">Create a plan above to define features and limits.</p>
          </div>
        )}
      </div>
    </div>
  );
}
