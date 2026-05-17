"use client"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import {
  TrendingUpIcon,
  TrendingDownIcon,
  PackageIcon,
  AlertTriangleIcon,
  ShoppingCartIcon,
  DollarSignIcon,
} from "lucide-react"
import { ChartAreaInventory } from "./ChartAreaInventory"

export function DashboardClient() {
  const stats = useQuery(api.inventory.getInventoryStats)
  const alerts = useQuery(api.alerts.getUnreadCount)

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-LK", {
      style:                 "currency",
      currency:              "LKR",
      maximumFractionDigits: 0,
    }).format(val)

  if (!stats) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-8 w-32 rounded bg-muted mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6 @container/main">

      {/* ── KPI Cards ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 px-0
        *:data-[slot=card]:bg-gradient-to-t
        *:data-[slot=card]:from-primary/5
        *:data-[slot=card]:to-card
        *:data-[slot=card]:shadow-xs
        @xl/main:grid-cols-2
        @5xl/main:grid-cols-4
        dark:*:data-[slot=card]:bg-card"
      >

        {/* Total SKUs */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total SKUs</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats.totalProducts.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <PackageIcon className="size-3" />
                Active
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Healthy: {stats.healthyCount}
              <TrendingUpIcon className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Products tracked in system
            </div>
          </CardFooter>
        </Card>

        {/* Critical Stock */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Critical Stock</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-destructive">
              {stats.criticalCount}
            </CardTitle>
            <CardAction>
              <Badge variant="destructive">
                <AlertTriangleIcon className="size-3" />
                Urgent
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium text-destructive">
              Needs immediate action
              <TrendingDownIcon className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Below safety stock level
            </div>
          </CardFooter>
        </Card>

        {/* Low Stock */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Low Stock</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-yellow-500">
              {stats.lowCount}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                <TrendingDownIcon className="size-3" />
                Warning
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Overstock: {stats.overstockCount}
            </div>
            <div className="text-muted-foreground">
              Below reorder point
            </div>
          </CardFooter>
        </Card>

        {/* Total Stock Value */}
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Stock Value</CardDescription>
            <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
              {formatCurrency(stats.totalValue)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUpIcon className="size-3" />
                LKR
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Total inventory value
              <DollarSignIcon className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Based on cost price
            </div>
          </CardFooter>
        </Card>

      </div>

      {/* ── Chart ─────────────────────────────── */}
      <div className="grid gap-4 @xl/main:grid-cols-2">
        <ChartAreaInventory />

        {/* Quick stats card */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Status Overview</CardTitle>
            <CardDescription>
              Distribution across all products
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Healthy",   count: stats.healthyCount,   color: "bg-green-500",      pct: Math.round(stats.healthyCount   / stats.totalProducts * 100) },
              { label: "Low Stock", count: stats.lowCount,        color: "bg-yellow-500",     pct: Math.round(stats.lowCount       / stats.totalProducts * 100) },
              { label: "Critical",  count: stats.criticalCount,   color: "bg-destructive",    pct: Math.round(stats.criticalCount  / stats.totalProducts * 100) },
              { label: "Overstock", count: stats.overstockCount,  color: "bg-blue-500",       pct: Math.round(stats.overstockCount / stats.totalProducts * 100) },
            ].map(item => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">
                    {item.count} ({item.pct}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}