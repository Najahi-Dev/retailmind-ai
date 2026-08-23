"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, Users, Building2, Package, TrendingUp, AlertCircle, ShoppingCart, 
  Activity, ArrowUpRight, ArrowDownRight, DollarSign
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell, PieChart, Pie
} from "recharts";

export default function SuperAdminReports() {
  const { token } = useAuth();
  
  const overview = useQuery(api.analyticsAdmin.getPlatformOverview, { token: token ?? undefined });
  const growthData = useQuery(api.analyticsAdmin.getTenantGrowth, { token: token ?? undefined });
  const activityData = useQuery(api.analyticsAdmin.getActivityMetrics, { token: token ?? undefined });

  if (overview === undefined || growthData === undefined || activityData === undefined) {
    return <div className="flex h-screen items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-4"></div>
        <p className="text-muted-foreground font-medium">Crunching Platform Analytics...</p>
      </div>
    </div>;
  }

  const kpis = [
    { title: "Total Tenants", value: overview.totalTenants, subtext: `${overview.activeTenants} Active Organizations`, icon: Building2, color: "text-blue-500", trend: "+12%" },
    { title: "Total Users", value: overview.totalUsers, subtext: "Across the ecosystem", icon: Users, color: "text-indigo-500", trend: "+24%" },
    { title: "Gross Merchandise Value", value: `LKR ${overview.gmv.toLocaleString()}`, subtext: "Total GMV Processed", icon: DollarSign, color: "text-emerald-500", trend: "+18%" },
    { title: "Monthly Recurring Rev", value: `$${overview.mrr.toLocaleString()}`, subtext: "Estimated MRR", icon: TrendingUp, color: "text-amber-500", trend: "+5%" },
  ];

  const tierData = [
    { name: "Starter", value: overview.tiers.starter, fill: "#94a3b8" },
    { name: "Growth", value: overview.tiers.growth, fill: "#60a5fa" },
    { name: "Enterprise", value: overview.tiers.enterprise, fill: "#818cf8" },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Platform Analytics</h1>
          <p className="text-indigo-200 mt-1 sm:max-w-xl w-[95vw] sm:w-full text-sm leading-relaxed">
            Holistic view of the RetailMind AI ecosystem performance and scale. Monitor tenant adoption, financial metrics, and overall system health in real-time.
          </p>
        </div>
        <div className="relative z-10 flex gap-4">
            <div className="bg-white/10 backdrop-blur border border-white/10 rounded-lg p-3 text-center min-w-[120px]">
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Active POs</div>
              <div className="text-2xl font-bold text-emerald-400">{overview.pendingPOs}</div>
            </div>
            <div className="bg-white/10 backdrop-blur border border-white/10 rounded-lg p-3 text-center min-w-[120px]">
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Open Tickets</div>
              <div className="text-2xl font-bold text-red-400">{overview.openTickets}</div>
            </div>
          </div>
        </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-slate-100/50 dark:bg-slate-900/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg px-6 py-2">Overview</TabsTrigger>
          <TabsTrigger value="growth" className="rounded-lg px-6 py-2">Adoption & Growth</TabsTrigger>
          <TabsTrigger value="ecosystem" className="rounded-lg px-6 py-2">Ecosystem Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <Card key={i} className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                    <div className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-900 ${kpi.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{kpi.value}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                        <ArrowUpRight className="w-3 h-3 mr-1" /> {kpi.trend}
                      </span>
                      <p className="text-xs text-muted-foreground">{kpi.subtext}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="col-span-1 lg:col-span-2 border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <CardTitle>Ecosystem Revenue Growth</CardTitle>
                <CardDescription>Monthly Recurring Revenue over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `$${val}`} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value) => [`$${value}`, "Revenue"]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <CardTitle>Tenant Subscriptions</CardTitle>
                <CardDescription>Current tier distribution across the platform</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                <div className="h-[250px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tierData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {tierData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold">{overview.totalTenants}</span>
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Tenants</span>
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-4 mt-2 w-full">
                  {tierData.map(t => (
                    <div key={t.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.fill }}></div>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{t.name}</span>
                      <span className="text-slate-400">({t.value})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="growth" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle>User & Tenant Adoption</CardTitle>
              <CardDescription>Growth of organizations and active users over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorTenants" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Area yAxisId="left" type="monotone" dataKey="users" name="Total Users" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                    <Area yAxisId="right" type="monotone" dataKey="tenants" name="Active Tenants" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTenants)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ecosystem" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-indigo-500" /> B2B Transaction Health</CardTitle>
                <CardDescription>Distribution of Purchase Order statuses platform-wide</CardDescription>
              </CardHeader>
              <CardContent>
                {activityData.poStats.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activityData.poStats} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} width={80} />
                        <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                          {activityData.poStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">No transaction data available.</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-500" /> Support Ticket Resolution</CardTitle>
                <CardDescription>Current state of tenant support requests</CardDescription>
              </CardHeader>
              <CardContent>
                {activityData.ticketStats.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={activityData.ticketStats}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => percent ? `${name} ${(percent * 100).toFixed(0)}%` : name}
                          labelLine={false}
                        >
                          {activityData.ticketStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">No support tickets found.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
