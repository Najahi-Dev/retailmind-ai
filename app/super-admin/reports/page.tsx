"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, Users, Building2, Package, TrendingUp, AlertCircle, ShoppingCart } from "lucide-react";

export default function SuperAdminReports() {
  const { token } = useAuth();
  const stats = useQuery(api.communicationsAdmin.getPlatformStats, { token: token ?? undefined });

  if (stats === undefined) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">Loading Platform Analytics...</div>;
  }

  const kpis = [
    { title: "Total Tenants", value: stats.totalTenants, subtext: `${stats.activeTenants} Active`, icon: Building2, color: "text-blue-500" },
    { title: "Total Users", value: stats.totalUsers, subtext: "Across all tenants", icon: Users, color: "text-indigo-500" },
    { title: "Monthly Recurring Revenue", value: `$${stats.mrr.toLocaleString()}`, subtext: "Estimated MRR", icon: TrendingUp, color: "text-emerald-500" },
    { title: "Products Managed", value: stats.totalProducts.toLocaleString(), subtext: "Platform-wide SKUs", icon: Package, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Analytics & Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">Holistic view of the RetailMind AI ecosystem performance and scale.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpi.subtext}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="w-5 h-5 text-red-500" /> Action Items
            </CardTitle>
            <CardDescription>Metrics requiring immediate attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
              <div>
                <div className="font-semibold text-red-700 dark:text-red-400">Open Support Tickets</div>
                <div className="text-sm text-red-600/80 dark:text-red-400/80">Awaiting platform staff response</div>
              </div>
              <div className="text-3xl font-bold text-red-600 dark:text-red-500">{stats.openTickets}</div>
            </div>
            
            <div className="flex justify-between items-center p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
              <div>
                <div className="font-semibold text-amber-700 dark:text-amber-400">Pending Purchase Orders</div>
                <div className="text-sm text-amber-600/80 dark:text-amber-400/80">Awaiting supplier confirmation</div>
              </div>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-500">{stats.pendingPOs}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-indigo-500" /> System Growth (Mock)
            </CardTitle>
            <CardDescription>Platform adoption over the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-2 mt-4 px-2">
              {[40, 55, 45, 70, 85, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-indigo-100 dark:bg-indigo-900/40 rounded-t-sm relative group cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-800/60 transition-all" style={{ height: `${h}%` }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-xs py-1 px-2 rounded pointer-events-none transition-opacity">
                    {h * 12}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground px-2">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
