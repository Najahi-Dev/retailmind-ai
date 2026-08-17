"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Activity, CreditCard, DollarSign, RefreshCw, HandCoins, AlertOctagon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function SuperAdminBilling() {
  const { token } = useAuth();
  const orgs = useQuery(api.superAdmin.getAllOrganizations, { token: token ?? undefined });
  const dlqEvents = useQuery(api.billingEngine.getWebhookFailures, { token: token ?? undefined });
  
  const processOfflinePayment = useMutation(api.billingEngine.processOfflinePayment);
  const resolveWebhookFailure = useMutation(api.billingEngine.resolveWebhookFailure);

  const [offlineOrgId, setOfflineOrgId] = useState("");
  const [offlineTier, setOfflineTier] = useState<"STARTER" | "GROWTH" | "ENTERPRISE">("ENTERPRISE");

  if (!orgs || !dlqEvents) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Activity className="animate-spin w-6 h-6 text-indigo-500 mr-2" />
        Loading Financial Intelligence...
      </div>
    );
  }

  const payingOrgs = orgs.filter((o: any) => o.subscriptionStatus === "ACTIVE");

  const handleOfflinePayment = async () => {
    try {
      await processOfflinePayment({
        token: token ?? undefined,
        orgId: offlineOrgId as any,
        planTier: offlineTier,
      });
      toast.success("Offline payment processed successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to process offline payment");
    }
  };

  const handleRetryWebhook = async (id: any) => {
    try {
      // In a real app we'd re-trigger the webhook handler logic here or hit the Stripe API
      await resolveWebhookFailure({
        token: token ?? undefined,
        id,
        status: "retried",
      });
      toast.success("Webhook event marked as retried");
    } catch (err: any) {
      toast.error(err.message || "Failed to retry webhook");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Financial Intelligence & Billing</h1>
          <p className="text-indigo-200 mt-1">Overview of MRR, Stripe DLQ, and Offline Invoicing.</p>
        </div>
      </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <HandCoins className="w-4 h-4 mr-2" /> Record Offline Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Manual Settlement</DialogTitle>
              <DialogDescription>
                Bypass Stripe and manually activate a tenant's subscription via bank transfer/cash.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Organization</label>
                <Select value={offlineOrgId} onValueChange={setOfflineOrgId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose organization..." />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs.map((org: any) => (
                      <SelectItem key={org._id} value={org._id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Plan Tier</label>
                <Select value={offlineTier} onValueChange={(val: any) => setOfflineTier(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose tier..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STARTER">Starter</SelectItem>
                    <SelectItem value="GROWTH">Growth</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleOfflinePayment} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!offlineOrgId}>
                Activate Subscription (30 Days)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center">
              <CreditCard className="w-6 h-6 mr-3 text-indigo-500" />
              {payingOrgs.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">Monthly Recurring Revenue (Est.)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500 flex items-center">
              <DollarSign className="w-6 h-6 mr-1" />
              {payingOrgs.reduce((acc: number, org: any) => {
                if (org.planTier === "GROWTH") return acc + 49;
                if (org.planTier === "ENTERPRISE") return acc + 199;
                return acc;
              }, 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20">
          <CardHeader className="pb-2 bg-red-50/50 dark:bg-red-950/20">
            <CardTitle className="text-muted-foreground text-sm flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-red-500" /> Stripe Webhook DLQ
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-red-500 flex items-center">
              {dlqEvents.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending failed webhook events</p>
          </CardContent>
        </Card>
      </div>

      {dlqEvents.length > 0 && (
        <Card className="border-red-500/20 shadow-lg shadow-red-500/5">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">Dead-Letter Queue (Action Required)</CardTitle>
            <CardDescription>
              Stripe webhook payloads that failed to process. They must be resolved manually.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event ID</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Error Message</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dlqEvents.map((evt: any) => (
                  <TableRow key={evt._id}>
                    <TableCell className="font-mono text-xs">{evt.eventId}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                        {evt.eventType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-red-600 truncate max-w-xs">{evt.error}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => handleRetryWebhook(evt._id)}>
                        <RefreshCw className="w-3 h-3 mr-2" /> Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active Payer Directory</CardTitle>
          <CardDescription>
            List of tenants currently subscribed to paid tiers (via Stripe or Offline).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Est. MRR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payingOrgs.map((org: any) => (
                <TableRow key={org._id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {org.paymentMethod || "stripe"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 uppercase text-[10px]">
                      {org.planTier || "GROWTH"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-bold">
                    ${org.planTier === "ENTERPRISE" ? "199" : org.planTier === "GROWTH" ? "49" : "0"}
                  </TableCell>
                </TableRow>
              ))}
              {payingOrgs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No active paid subscriptions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
