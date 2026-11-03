"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, ShieldCheck, Target, TrendingUp, AlertTriangle, TrendingDown, Search, Loader2, BrainCircuit, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { UpgradePrompt } from "@/components/upgrade-prompt";

export function ForecastingClient() {
  const router = useRouter();
  const { token } = useAuth();
  const overview = useQuery(api.forecasting.getForecastOverview, token ? { token } : "skip");
  const access = useQuery(api.subscriptions.checkFeatureAccess, { token: token ?? undefined });
  const generateForecasts = useAction(api.forecasting.generateOrgForecasts);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [search, setSearch] = useState("");

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      await generateForecasts({ token: token ?? undefined });
      toast.success("Forecasts generated successfully.");
    } catch (e) {
      toast.error("Failed to generate forecasts.");
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  if (access && !access.canAccessForecasting) {
    return (
      <div className="p-6">
        <UpgradePrompt
          title="AI Demand Forecasting Gated"
          description="Hyper-accurate future demand predictions and automated safety stock planning are exclusive to RetailMind AI Growth & Enterprise plans."
        />
      </div>
    );
  }

  if (!overview || !access) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredProducts = overview.allForecastedProducts.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 lg:p-6">
      {/* ── 1. EXECUTIVE HEADER & HERO BANNER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 text-white p-6 rounded-xl shadow-xl border shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs px-3 py-0.5">
              <BrainCircuit className="w-3.5 h-3.5 mr-1 text-indigo-400 animate-pulse" />
              Neural Forecasting Engine
            </Badge>
            <span className="text-slate-400 text-xs hidden sm:inline">• Automated Supermarket Demand Predictor</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            AI Demand Forecasting & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 sm:max-w-2xl w-[95vw] sm:w-full">
            Hyper-accurate future demand predictions powered by Prophet and XGBoost. Prevent stockouts, optimize inventory, and capitalize on seasonal trends.
          </p>
        </div>

        <div className="flex items-center gap-2.5 z-10">
          <Button
            size="sm"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-md border-0 rounded-xl h-10 px-4"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing History...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" /> Generate Forecasts</>
            )}
          </Button>
        </div>
      </div>

      {/* ── 2. EXECUTIVE KPI GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total Forecasted</CardDescription>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {overview.totalForecasted}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-slate-500 font-medium">Active predictions</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">High Confidence</CardDescription>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {overview.highConfidence}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Over 80% sure</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Avg Accuracy</CardDescription>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {overview.avgAccuracy.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Across all models</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Demand Spikes</CardDescription>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {overview.demandSpikes}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Upcoming surges</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Stockout Risk</CardDescription>
              <div className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {overview.stockoutRisks}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-red-600 dark:text-red-400 font-medium">Needs reorder soon</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <CardHeader className="pb-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Slow Movers</CardDescription>
              <div className="p-2 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {overview.slowMovers}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Declining demand</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Growing Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overview.topGrowing.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">{item.product.sku}</p>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                    +{item.growth.toFixed(1)}%
                  </Badge>
                </div>
              ))}
              {overview.topGrowing.length === 0 && (
                <div className="text-sm text-muted-foreground py-2">No growing products found.</div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Declining Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overview.topDeclining.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">{item.product.sku}</p>
                  </div>
                  <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">
                    {item.growth.toFixed(1)}%
                  </Badge>
                </div>
              ))}
              {overview.topDeclining.length === 0 && (
                <div className="text-sm text-muted-foreground py-2">No declining products found.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Forecasted Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="text-right">7 Day Forecast</TableHead>
                  <TableHead className="text-right">30 Day Forecast</TableHead>
                  <TableHead className="text-right">MAPE</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={product.modelUsed === "prophet" ? "border-purple-500 text-purple-500" : "border-amber-500 text-amber-500"}>
                        {product.modelUsed}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(product.confidence * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-right">{Math.round(product.forecast7)}</TableCell>
                    <TableCell className="text-right">{Math.round(product.forecast30)}</TableCell>
                    <TableCell className="text-right">{product.mape}%</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/forecasting/${product._id}`)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No forecasts found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
