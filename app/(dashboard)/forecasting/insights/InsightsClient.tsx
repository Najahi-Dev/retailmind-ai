"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, AlertTriangle, TrendingDown, CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type FilterTab = "all" | "demand_spike" | "stockout_risk" | "slow_mover";

export function InsightsClient() {
  const router = useRouter();
  const { token } = useAuth();
  const insights = useQuery(api.forecasting.getAIInsights, token ? { token } : "skip");
  const [filter, setFilter] = useState<FilterTab>("all");

  if (!insights) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredInsights = filter === "all" ? insights : insights.filter(i => i.type === filter);

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Insights Feed</h1>
          <p className="text-muted-foreground">Actionable anomalies and risks identified by the forecasting model.</p>
        </div>
      </div>

      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} size="sm">
          All Insights
        </Button>
        <Button variant={filter === "demand_spike" ? "default" : "outline"} onClick={() => setFilter("demand_spike")} size="sm">
          Demand Spikes
        </Button>
        <Button variant={filter === "stockout_risk" ? "default" : "outline"} onClick={() => setFilter("stockout_risk")} size="sm">
          Stockout Risks
        </Button>
        <Button variant={filter === "slow_mover" ? "default" : "outline"} onClick={() => setFilter("slow_mover")} size="sm">
          Slow Movers
        </Button>
      </div>

      {filteredInsights.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-medium">All clear!</h3>
          <p className="text-muted-foreground">All products have stable demand forecasts. No immediate actions required.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredInsights.map(insight => (
            <Card key={insight.id} className="overflow-hidden">
              <div className="flex p-6">
                <div className="mr-6 hidden sm:block">
                  {insight.type === "demand_spike" && (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-500">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                  )}
                  {insight.type === "stockout_risk" && (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-500">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                  )}
                  {insight.type === "slow_mover" && (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20 text-blue-500">
                      <TrendingDown className="h-6 w-6" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">{insight.headline}</h3>
                    <span className="text-xs text-muted-foreground">
                      {new Date(insight.generatedAt).toLocaleString()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{insight.explanation}</p>
                  
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {insight.metrics.map((m: any, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {m.label}: {m.value}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="ml-6 flex flex-col items-end justify-between border-l pl-6">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">SKU</div>
                    <div className="font-mono text-sm">{insight.sku}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/forecasting/${insight.productId}`)}>
                    View Forecast
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
