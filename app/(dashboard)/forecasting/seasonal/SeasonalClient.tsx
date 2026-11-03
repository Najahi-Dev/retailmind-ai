"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from "recharts";
import { Id } from "@/convex/_generated/dataModel";

export function SeasonalClient() {
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  
  const { token } = useAuth();
  const products = useQuery(api.forecasting.getAllActiveProducts, token ? { token } : "skip") || [];
  const seasonalData = useQuery(
    api.forecasting.getSeasonalTrends,
    selectedProductId && token ? { token, productId: selectedProductId as Id<"products"> } : "skip"
  );

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Seasonal Trends</h1>
          <p className="text-muted-foreground">Analyze demand patterns across months and years</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Product</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Search and select a product..." />
              </SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p._id} value={p._id}>{p.name} ({p.sku})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedProductId && !seasonalData && (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {seasonalData && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Demand Pattern</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={seasonalData.monthlyAverages} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="average" position="top" formatter={(val: any) => Math.round(Number(val))} />
                        {seasonalData.monthlyAverages.map((entry, index) => {
                          const avgValues = seasonalData.monthlyAverages.map(d => d.average);
                          const sortedAvg = [...avgValues].sort((a, b) => b - a);
                          // Highlight top 3 peak months in amber, bottom 3 in blue
                          const isPeak = entry.average >= sortedAvg[2];
                          const isLow = entry.average <= sortedAvg[sortedAvg.length - 3];
                          let color = "#cbd5e1"; // default slate
                          if (isPeak) color = "#f59e0b"; // amber
                          else if (isLow) color = "#3b82f6"; // blue
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Year on Year Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                {seasonalData.years.length >= 2 ? (
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" type="category" allowDuplicatedCategory={false} tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Legend />
                        {seasonalData.years.map((yearObj, i) => (
                          <Line
                            key={yearObj.year}
                            data={yearObj.data}
                            name={yearObj.year.toString()}
                            dataKey="value"
                            stroke={`hsl(${i * 60 + 200}, 70%, 50%)`}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    Insufficient historical data for year-on-year comparison (requires at least 2 years).
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Seasonal Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(() => {
                   const sorted = [...seasonalData.monthlyAverages].sort((a, b) => b.average - a.average);
                   const peaks = sorted.slice(0, 3).filter(x => x.average > 0);
                   const lows = sorted.slice(-3).reverse().filter(x => x.average > 0);
                   
                   const peakText = peaks.length > 0 ? `Peak demand occurs in ${peaks.map(p => p.month).join(", ")}.` : "";
                   const lowText = lows.length > 0 ? `Lowest demand occurs in ${lows.map(p => p.month).join(", ")}.` : "";
                   
                   let yoyText = "";
                   if (seasonalData.years.length >= 2) {
                     const sortedYears = [...seasonalData.years].sort((a, b) => b.year - a.year);
                     const recent = sortedYears[0].data.reduce((sum, d) => sum + d.value, 0);
                     const previous = sortedYears[1].data.reduce((sum, d) => sum + d.value, 0);
                     
                     if (previous > 0) {
                        const diff = ((recent - previous) / previous) * 100;
                        if (diff > 0) {
                          yoyText = `Overall demand grew by ${diff.toFixed(1)}% compared to the previous year.`;
                        } else if (diff < 0) {
                          yoyText = `Overall demand declined by ${Math.abs(diff).toFixed(1)}% compared to the previous year.`;
                        } else {
                          yoyText = `Overall demand remained stable compared to the previous year.`;
                        }
                     }
                   }
                   
                   return (
                     <div className="text-muted-foreground">
                       <ul className="list-disc pl-5 space-y-1">
                         {peakText && <li>{peakText}</li>}
                         {lowText && <li>{lowText}</li>}
                         {yoyText && <li>{yoyText}</li>}
                         {!peakText && !lowText && !yoyText && <li>Not enough data to generate insights.</li>}
                       </ul>
                     </div>
                   );
                })()}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
