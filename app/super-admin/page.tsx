"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Users, DollarSign, Activity, TrendingUp, Cpu, Server, CreditCard, Zap, PackageSearch, ClipboardList, Clock } from "lucide-react";
import { ComposedChart, AreaChart, Area, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
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
          csvContent += `Estimated MRR,LKR ${metrics.mrr}\n\n`;
          
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-br from-indigo-950 via-violet-900 to-indigo-900 p-8 rounded-2xl text-white shadow-2xl shadow-indigo-900/20 overflow-hidden relative border border-indigo-500/20">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05] mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/50 border border-indigo-400/30 backdrop-blur-md mb-4 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">System Live</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
            Platform Command Center
          </h1>
          <p className="text-indigo-200/80 mt-2 text-sm max-w-xl leading-relaxed">
            Real-time overview of the RetailMind AI ecosystem. Monitor tenants, revenue, and platform telemetry in one unified view.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <Button 
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md shadow-lg transition-all hover:scale-105 active:scale-95" 
            onClick={handleGenerateReport}
          >
            <Zap className="w-4 h-4 mr-2 text-amber-300" />
            Generate Report
          </Button>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="group hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Tenants</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">{metrics.totalOrgs}</h3>
                  <span className="text-xs font-bold text-emerald-500 flex items-center bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full"><TrendingUp className="w-3 h-3 mr-1" /> +12%</span>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/50 dark:to-indigo-950/50 rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                <Building2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mt-5 flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>{metrics.activeOrgs} active subscriptions</p>
          </CardContent>
        </Card>

        <Card className="group hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Users</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">{metrics.totalUsers}</h3>
                  <span className="text-xs font-bold text-emerald-500 flex items-center bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full"><TrendingUp className="w-3 h-3 mr-1" /> +5%</span>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/50 dark:to-emerald-950/50 rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                <Users className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mt-5 flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>{metrics.activeUsers} active accounts</p>
          </CardContent>
        </Card>

        <Card className="group hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estimated MRR</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">LKR {metrics.mrr.toLocaleString()}</h3>
                  <span className="text-xs font-bold text-emerald-500 flex items-center bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full"><TrendingUp className="w-3 h-3 mr-1" /> +18%</span>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/50 dark:to-amber-950/50 rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mt-5 flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>Based on active paid tiers</p>
          </CardContent>
        </Card>

        <Card className="group hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-300 border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-br from-violet-50/50 to-white dark:from-violet-950/20 dark:to-slate-900/50 backdrop-blur-xl relative overflow-hidden">
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Platform Health</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-4xl font-extrabold tracking-tight text-violet-600 dark:text-violet-400">99.9%</h3>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-violet-200 to-violet-100 dark:from-violet-900/70 dark:to-violet-950 rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                <Activity className="w-7 h-7 text-violet-700 dark:text-violet-300" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mt-5 flex items-center"><span className="w-2 h-2 rounded-full bg-violet-500 mr-2"></span>All systems operational</p>
          </CardContent>
        </Card>

        <Card className="group hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Products Tracked</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">{metrics.totalProducts?.toLocaleString() || 0}</h3>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/50 dark:to-blue-950/50 rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                <PackageSearch className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mt-5 flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>Across all workspaces</p>
          </CardContent>
        </Card>

        <Card className="group hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Purchase Orders</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">{metrics.totalPurchaseOrders?.toLocaleString() || 0}</h3>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/50 dark:to-orange-950/50 rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                <ClipboardList className="w-7 h-7 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mt-5 flex items-center"><span className="w-2 h-2 rounded-full bg-orange-500 mr-2"></span>Processed globally</p>
          </CardContent>
        </Card>
      </div>
      {/* Top Row: Main Chart & Plan Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6 items-stretch">
        <div className="xl:col-span-2">
          {/* Main Chart */}
          <Card className="shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden flex flex-col h-full">
            <CardHeader className="min-h-[72px] bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Platform Revenue Growth</CardTitle>
                  <CardDescription>Monthly Recurring Revenue over the last 7 months</CardDescription>
                </div>
                <Select defaultValue="7m">
                  <SelectTrigger className="w-[140px] h-8 text-xs font-semibold bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7m">Last 7 months</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="1y">Last 1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col justify-center">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={metrics.chartData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorTenants" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-slate-800" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} stroke="#6b7280" />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(value) => `LKR ${value/1000}k`} stroke="#6b7280" />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                      itemStyle={{ color: '#111827', fontWeight: 600 }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Area yAxisId="left" type="monotone" dataKey="revenue" name="MRR (LKR)" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                    <Line yAxisId="right" type="monotone" dataKey="tenants" name="Tenants" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Plan Distribution */}
        <div className="xl:col-span-1">
          <Card className="shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border-slate-200/60 dark:border-slate-800/60 rounded-2xl flex flex-col h-full">
            <CardHeader className="min-h-[72px] pb-4 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-center">
              <CardTitle className="text-base font-semibold">Plan Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-1 flex flex-col justify-center">
              <div className="h-[200px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Enterprise', value: metrics.planDistribution?.ENTERPRISE || 0, color: '#8b5cf6' },
                        { name: 'Growth', value: metrics.planDistribution?.GROWTH || 0, color: '#3b82f6' },
                        { name: 'Starter', value: metrics.planDistribution?.STARTER || 0, color: '#10b981' },
                        { name: 'Free', value: metrics.planDistribution?.FREE || 0, color: '#94a3b8' },
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={[
                        { name: 'Enterprise', value: metrics.planDistribution?.ENTERPRISE || 0 },
                        { name: 'Growth', value: metrics.planDistribution?.GROWTH || 0 },
                        { name: 'Starter', value: metrics.planDistribution?.STARTER || 0 },
                        { name: 'Free', value: metrics.planDistribution?.FREE || 0 },
                      ].filter(d => d.value > 0).length > 1 ? 2 : 0}
                      dataKey="value"
                      stroke="none"
                    >
                      {
                        [
                          { name: 'Enterprise', value: metrics.planDistribution?.ENTERPRISE || 0, color: '#8b5cf6' },
                          { name: 'Growth', value: metrics.planDistribution?.GROWTH || 0, color: '#3b82f6' },
                          { name: 'Starter', value: metrics.planDistribution?.STARTER || 0, color: '#10b981' },
                          { name: 'Free', value: metrics.planDistribution?.FREE || 0, color: '#94a3b8' },
                        ].filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))
                      }
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-4 text-xs font-medium px-4">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-sm shadow-violet-500/50"></span>Enterprise</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>Growth</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>Starter</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 shadow-sm shadow-slate-400/50"></span>Free</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Row: PO Volume, Telemetry, Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6 items-stretch">
        
        {/* Transaction Volume */}
        <div className="xl:col-span-1">
          <Card className="shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden flex flex-col h-full">
            <CardHeader className="min-h-[72px] bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col justify-center">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base font-semibold">Transaction Volume</CardTitle>
                  <CardDescription>B2B Purchase Orders</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex-1 flex flex-col justify-center">
              <div className="h-[200px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.chartData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPO" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-slate-800" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} stroke="#6b7280" />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                      itemStyle={{ color: '#111827', fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="purchaseOrders" name="Purchase Orders" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorPO)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Telemetry */}
        <div className="xl:col-span-1">
          <Card className="shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border-slate-200/60 dark:border-slate-800/60 rounded-2xl flex flex-col h-full">
            <CardHeader className="min-h-[72px] pb-4 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-center">
              <div className="flex flex-col">
                <CardTitle className="text-base font-semibold">System Telemetry</CardTitle>
                <CardDescription>Real-time infrastructure health</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 flex-1">
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
        </div>

        {/* Workspace Health */}
        <div className="xl:col-span-1">
          <Card className="shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border-slate-200/60 dark:border-slate-800/60 rounded-2xl flex flex-col h-full">
            <CardHeader className="min-h-[72px] pb-4 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-center">
              <CardTitle className="text-base font-semibold">Workspace Health</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-1 flex flex-col justify-center">
              <div className="h-[200px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: metrics.statusDistribution?.ACTIVE || 0, color: '#10b981' },
                        { name: 'Trialing', value: metrics.statusDistribution?.TRIALING || 0, color: '#f59e0b' },
                        { name: 'Past Due', value: metrics.statusDistribution?.PAST_DUE || 0, color: '#f43f5e' },
                        { name: 'Canceled', value: metrics.statusDistribution?.CANCELED || 0, color: '#64748b' },
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={[
                        { name: 'Active', value: metrics.statusDistribution?.ACTIVE || 0 },
                        { name: 'Trialing', value: metrics.statusDistribution?.TRIALING || 0 },
                        { name: 'Past Due', value: metrics.statusDistribution?.PAST_DUE || 0 },
                        { name: 'Canceled', value: metrics.statusDistribution?.CANCELED || 0 },
                      ].filter(d => d.value > 0).length > 1 ? 2 : 0}
                      dataKey="value"
                      stroke="none"
                    >
                      {
                        [
                          { name: 'Active', value: metrics.statusDistribution?.ACTIVE || 0, color: '#10b981' },
                          { name: 'Trialing', value: metrics.statusDistribution?.TRIALING || 0, color: '#f59e0b' },
                          { name: 'Past Due', value: metrics.statusDistribution?.PAST_DUE || 0, color: '#f43f5e' },
                          { name: 'Canceled', value: metrics.statusDistribution?.CANCELED || 0, color: '#64748b' },
                        ].filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))
                      }
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-4 text-xs font-medium px-4">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>Active</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>Trialing</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span>Past Due</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-500 shadow-sm shadow-slate-500/50"></span>Canceled</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border-slate-200/60 dark:border-slate-800/60 rounded-2xl h-full">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between rounded-t-2xl">
            <div>
              <CardTitle className="text-base font-semibold">Newest Workspaces</CardTitle>
              <CardDescription>Recently registered tenants</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {metrics.recentOrganizations && metrics.recentOrganizations.length > 0 ? (
                metrics.recentOrganizations.map((org: any) => (
                  <div key={org.id} className="py-4 flex justify-between items-center group hover:bg-slate-50 dark:hover:bg-slate-900/50 px-2 -mx-2 rounded-lg transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/50 dark:to-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800 shadow-sm">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{org.name}</p>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Joined {new Date(org.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={org.plan === "ENTERPRISE" ? "default" : org.plan === "GROWTH" ? "secondary" : "outline"} className={`capitalize px-3 py-1 font-medium ${org.plan === "ENTERPRISE" ? "bg-violet-600" : org.plan === "GROWTH" ? "bg-blue-600" : ""}`}>
                      {org.plan.toLowerCase()}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No organizations found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Activity */}
        <Card className="shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border-slate-200/60 dark:border-slate-800/60 rounded-2xl h-full">
          <CardHeader className="pb-3 border-slate-100 dark:border-slate-800/50 bg-white dark:bg-slate-950 rounded-t-2xl">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Live Activity</CardTitle>
              <Link href="/super-admin/audit" className="text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 transition-colors">
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="relative py-2">
              {/* Center Vertical Line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800 -translate-x-1/2"></div>
              
              <div className="space-y-6 relative z-10">
                {metrics.recentActivity?.map((activity: any, idx: number) => {
                  const isRight = idx % 2 === 0;
                  return (
                    <div key={idx} className="relative flex items-center justify-between w-full group">
                      {/* Dot in center */}
                      <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-violet-500 ring-[6px] ring-white dark:ring-slate-950 z-20 group-hover:scale-125 transition-transform duration-300"></div>
                      
                      {isRight ? (
                        <>
                          <div className="w-1/2 pr-6"></div>
                          <div className="w-1/2 pl-6">
                            <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2 gap-2">
                                  <span className="text-sm font-semibold text-violet-600 dark:text-violet-400 truncate">{activity.target}</span>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">{activity.time}</span>
                                </div>
                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{activity.event}</p>
                              </CardContent>
                            </Card>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-1/2 pr-6">
                            <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2 gap-2">
                                  <span className="text-sm font-semibold text-violet-600 dark:text-violet-400 truncate">{activity.target}</span>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">{activity.time}</span>
                                </div>
                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{activity.event}</p>
                              </CardContent>
                            </Card>
                          </div>
                          <div className="w-1/2 pl-6"></div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
