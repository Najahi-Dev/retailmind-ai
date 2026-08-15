"use client"
import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@/lib/auth-context"

const chartConfig = {
  stockIn: {
    label: "Stock In",
    color: "var(--primary)",
  },
  stockOut: {
    label: "Stock Out",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig

export function ChartAreaInventory() {
  const { token } = useAuth()
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d")
  }, [isMobile])

  const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90
  const realChartData = useQuery(api.inventory.getStockMovementChartData, { token: token ?? undefined, days }) ?? []

  const filteredData = realChartData.filter(item => {
    const date          = new Date(item.date)
    const referenceDate = new Date()
    let daysToSubtract  = 90
    if (timeRange === "30d") daysToSubtract = 30
    if (timeRange === "7d")  daysToSubtract = 7
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Stock Movement</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Stock in vs stock out — last {timeRange === "90d" ? "3 months" : timeRange === "30d" ? "30 days" : "7 days"}
          </span>
          <span className="@[540px]/card:hidden">Movement overview</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
              <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
              <SelectItem value="7d"  className="rounded-lg">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillStockIn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--color-stockIn)"  stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-stockIn)"  stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillStockOut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--color-stockOut)" stopOpacity={0.6} />
                <stop offset="95%" stopColor="var(--color-stockOut)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={value =>
                new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day:   "numeric",
                })
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={value =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day:   "numeric",
                    })
                  }
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="stockOut"
              type="natural"
              fill="url(#fillStockOut)"
              stroke="var(--color-stockOut)"
              stackId="a"
            />
            <Area
              dataKey="stockIn"
              type="natural"
              fill="url(#fillStockIn)"
              stroke="var(--color-stockIn)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}