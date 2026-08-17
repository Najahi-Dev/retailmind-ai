"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, CreditCard, DollarSign } from "lucide-react";

export default function SuperAdminBilling() {
  const { token } = useAuth();
  const orgs = useQuery(api.superAdmin.getAllOrganizations, { token: token ?? undefined });

  if (!orgs) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Activity className="animate-spin w-6 h-6 text-indigo-500 mr-2" />
        Loading Billing Data...
      </div>
    );
  }

  // Filter orgs that are paying
  const payingOrgs = orgs.filter((o: any) => o.subscriptionStatus === "ACTIVE");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Billing & Subscription Oversight</h1>
        <p className="text-slate-400 text-sm mt-1">Overview of MRR, active subscriptions, and custom enterprise tiers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-400 text-sm">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white flex items-center">
              <CreditCard className="w-6 h-6 mr-3 text-indigo-500" />
              {payingOrgs.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-400 text-sm">Monthly Recurring Revenue (Est.)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-400 flex items-center">
              <DollarSign className="w-6 h-6 mr-1" />
              {payingOrgs.reduce((acc: number, org: any) => {
                if (org.planTier === "GROWTH") return acc + 49;
                if (org.planTier === "ENTERPRISE") return acc + 199;
                return acc;
              }, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800 mt-8">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            Active Payer Directory
          </CardTitle>
          <CardDescription className="text-slate-400">
            List of tenants currently subscribed to paid tiers.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-slate-900/50">
                <TableHead className="text-slate-400">Organization</TableHead>
                <TableHead className="text-slate-400">Owner Email</TableHead>
                <TableHead className="text-slate-400">Plan</TableHead>
                <TableHead className="text-right text-slate-400">Est. MRR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payingOrgs.map((org: any) => (
                <TableRow key={org._id} className="border-slate-800 hover:bg-slate-800/50">
                  <TableCell className="font-medium text-slate-200">
                    {org.name}
                  </TableCell>
                  <TableCell className="text-sm text-slate-400">
                    {org.ownerEmail}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10 uppercase text-[10px]">
                      {org.planTier}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-emerald-400 font-bold">
                    ${org.planTier === "ENTERPRISE" ? "199" : org.planTier === "GROWTH" ? "49" : "0"}
                  </TableCell>
                </TableRow>
              ))}
              {payingOrgs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
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
