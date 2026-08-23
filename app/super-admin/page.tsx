"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Users, DollarSign, Activity, TrendingUp, Cpu, Server, CreditCard, ChevronRight, Zap } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";

const defaultSystemHealth = [
  { service: "Convex Database", status: "Operational", uptime: "99.99%", icon: Server, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { service: "AI Demand Engine", status: "Operational", uptime: "99.95%", icon: Cpu, color: "text-blue-500", bg: "bg-blue-500/10" },
  { service: "Stripe Billing", status: "Operational", uptime: "100%", icon: CreditCard, color: "text-purple-500", bg: "bg-purple-500/10" },
  { service: "Notification Service", status: "Operational", uptime: "99.9%", icon: Zap, color: "text-emerald-500", bg: "bg-emerald-500/10" },
];

export default function SuperAdminOverview() {
  const { token } = useAuth();
  const metrics = useQuery(api.superAdmin.getPlatformMetrics, { token: token ?? undefined });

  const handleGenerateReport = () => {
    if (!metrics) {
      toast.error("Metrics are still loading");
      return;
    }
    
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          let csvContent = "data:text/csv;charset=utf-8,";
          csvContent += "RetailMind AI Platform Report\n\n";
          
          csvContent += "Key Metrics\n";
          csvContent += `Total Tenants,${metrics.totalOrgs}\n`;
          csvContent += `Active Subscriptions,${metrics.activeOrgs}\n`;
          csvContent += `Total Users,${metrics.totalUsers}\n`;
          csvContent += `Active Users,${metrics.activeUsers}\n`;
          csvContent += `Estimated MRR,$${metrics.mrr}\n\n`;
          
          csvContent += "Revenue & Growth (Last 7 Months)\n";
          csvContent += "Month,Revenue,Tenants\n";
          if (metrics.chartData) {
            metrics.chartData.forEach((data: any) => {
              csvContent += `${data.name},${data.revenue},${data.tenants}\n`;
            });
          }
          
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", `platform-report-${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          resolve(true);
        }, 800);
      }),
      {
        loading: 'Generating report...',
        success: 'Report downloaded successfully!',
        error: 'Failed to generate report',
      }
    );
  };

  if (!metrics) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-muted-foreground gap-4">
        <Activity className="animate-spin w-8 h-8 text-indigo-600" />
        <p className="font-medium animate-pulse">Initializing Platform Telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight">Platform Command Center</h1>
          <p className="text-indigo-200 mt-1">Real-time overview of the RetailMind AI ecosystem.</p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <Badge variant="outline" className="flex items-center border-indigo-400 text-indigo-100 bg-indigo-950/50 backdrop-blur-md px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse inline-block"></span>
            System Live
          </Badge>
          <Button size="sm" className="bg-white text-indigo-900 hover:bg-indigo-50" onClick={handleGenerateReport}>Generate Report</Button>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow border-indigo-100 dark:border-indigo-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tenants</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-bold tracking-tight">{metrics.totalOrgs}</h3>
                  <span className="text-xs font-medium text-emerald-500 flex items-center"><TrendingUp className="w-3 h-3 mr-0.5" /> +12%</span>
                </div>
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-full">
                <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">{metrics.activeOrgs} active subscriptions</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-emerald-100 dark:border-emerald-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-bold tracking-tight">{metrics.totalUsers}</h3>
                  <span className="text-xs font-medium text-emerald-500 flex items-center"><TrendingUp className="w-3 h-3 mr-0.5" /> +5%</span>
                </div>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-full">
                <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">{metrics.activeUsers} active accounts</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-amber-100 dark:border-amber-900/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estimated MRR</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-bold tracking-tight">${metrics.mrr.toLocaleString()}</h3>
                  <span className="text-xs font-medium text-emerald-500 flex items-center"><TrendingUp className="w-3 h-3 mr-0.5" /> +18%</span>
                </div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-full">
                <DollarSign className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">Based on active paid tiers</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-violet-100 dark:border-violet-900/50 bg-gradient-to-br from-white to-violet-50/50 dark:from-slate-950 dark:to-violet-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Platform Health</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">99.9%</h3>
                </div>
              </div>
              <div className="p-3 bg-violet-100 dark:bg-violet-900/50 rounded-full">
                <Activity className="w-6 h-6 text-violet-600 dark:text-violet-300" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">All core systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Chart Section */}
        <Card className="xl:col-span-2 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Platform Revenue Growth</CardTitle>
                <CardDescription>Monthly Recurring Revenue over the last 7 months</CardDescription>
              </div>
              <Select defaultValue="7m">
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7m">Last 7 months</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.chartData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-slate-800" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} stroke="#6b7280" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dx={-10} tickFormatter={(value) => `$${value/1000}k`} stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#111827', fontWeight: 600 }}
                    formatter={(value: any) => [`$${typeof value === 'number' ? value.toLocaleString() : value}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* System Health */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">System Telemetry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(metrics.systemHealth || defaultSystemHealth).map((sys: any, i: number) => {
                const Icon = sys.service === "Convex Database" ? Server : sys.service === "AI Demand Engine" ? Cpu : sys.service === "Stripe Billing" ? CreditCard : Zap;
                const color = sys.status === "Operational" ? "text-emerald-500" : sys.status === "Degraded" ? "text-amber-500" : "text-red-500";
                const bg = sys.status === "Operational" ? "bg-emerald-500/10" : sys.status === "Degraded" ? "bg-amber-500/10" : "bg-red-500/10";
                
                return (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${bg}`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{sys.service}</p>
                      <p className="text-xs text-muted-foreground">{sys.status}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold">{sys.uptime}</span>
                </div>
              )})}
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Live Activity</CardTitle>
                <Link href="/super-admin/journal">
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-indigo-600 hover:text-indigo-700">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-5 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
                {(metrics.recentActivity || []).map((activity: any, i: number) => (
                  <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white dark:border-slate-950 bg-indigo-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border bg-white dark:bg-slate-950 shadow-sm text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-xs text-indigo-600 dark:text-indigo-400">{activity.target}</span>
                        <span className="text-[10px] text-muted-foreground">{activity.time}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-xs">{activity.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
