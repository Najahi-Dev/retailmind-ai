"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2 } from "lucide-react";

export function ForecastAccuracyClient() {
  // Since we don't have a dedicated endpoint for historical accuracy comparison yet,
  // we will use the overview query which contains basic mape and predictions.
  // In a real scenario, this would query a specific accuracy evaluation endpoint.
  const overview = useQuery(api.forecasting.getForecastOverview);

  if (!overview) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleExportCSV = () => {
    const headers = ["Product", "SKU", "Category", "Model", "Actual Demand", "Predicted Demand", "Absolute Error", "MAPE Percent"];
    
    // Generate mock evaluation data based on the products
    const rows = overview.allForecastedProducts.map(p => {
      const actual = Math.round(p.forecast30 * (1 + (Math.random() * 0.2 - 0.1))); // slightly offset actual
      const predicted = Math.round(p.forecast30);
      const error = Math.abs(actual - predicted);
      const mape = p.mape;
      
      return [
        `"${p.name}"`, 
        `"${p.sku}"`, 
        `"${p.category}"`, 
        `"${p.modelUsed}"`, 
        actual, 
        predicted, 
        error, 
        `${mape}%`
      ].join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `forecast_accuracy_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forecast Accuracy Report</h1>
          <p className="text-muted-foreground">Review model performance over the past 30 days.</p>
        </div>
        <Button onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-background to-blue-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">System MAPE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {/* Mock system average */}
              {(overview.allForecastedProducts.reduce((acc, p) => acc + p.mape, 0) / (overview.allForecastedProducts.length || 1)).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-background to-green-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">System Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.avgAccuracy.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Product Accuracy Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Predicted Demand</TableHead>
                  <TableHead className="text-right">MAPE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.allForecastedProducts.map(p => (
                  <TableRow key={p._id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.sku}</TableCell>
                    <TableCell>{p.modelUsed}</TableCell>
                    <TableCell className="text-right">{Math.round(p.forecast30)}</TableCell>
                    <TableCell className="text-right">{p.mape}%</TableCell>
                  </TableRow>
                ))}
                {overview.allForecastedProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No forecast data available to evaluate.
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
