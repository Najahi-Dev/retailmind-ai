"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Area, Bar, ComposedChart, CartesianGrid, Line, ReferenceLine, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  CalendarClockIcon,
  PackageCheckIcon,
  ShoppingCartIcon,
  SparklesIcon,
  RefreshCwIcon,
  LineChartIcon,
  InfoIcon,
} from "lucide-react";

const chartConfig = {
  actual: { label: "Actual sales", theme: { light: "#2563eb", dark: "#60a5fa" } },
  forecast: { label: "Forecast", theme: { light: "#7c3aed", dark: "#a78bfa" } },
  band: { label: "Likely range", theme: { light: "#c4b5fd", dark: "#4c1d95" } },
} satisfies ChartConfig;

const HORIZONS = [7, 14, 30] as const;
type Horizon = (typeof HORIZONS)[number];

const fmtDay = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const fmtLongDay = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
const fmtNum = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1));

interface Props {
  productId: Id<"products">;
  token: string | null | undefined;
  canRunForecast: boolean;
}

export default function DemandForecastTab({ productId, token, canRunForecast }: Props) {
  const data = useQuery(api.forecasting.getProductDemandInsights, token ? { token, productId } : "skip");
  const runForecast = useAction(api.forecasting.generateOrgForecasts);
  const [horizon, setHorizon] = useState<Horizon>(14);
  const [running, setRunning] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);

  const handleRun = async () => {
    if (!token) return;
    setRunning(true);
    try {
      const r = await runForecast({ token });
      toast.success(`ML forecast refreshed for ${r.processed} product${r.processed === 1 ? "" : "s"}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Forecast run failed");
    } finally {
      setRunning(false);
    }
  };

  if (data === undefined) {
    return (
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardContent className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500">
          <RefreshCwIcon className="size-4 animate-spin text-indigo-600" /> Loading demand forecast…
        </CardContent>
      </Card>
    );
  }

  const { stats, unit } = data;

  // ── Empty state: nothing sold in the last 60 days ──
  if (data.source === "none") {
    return (
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="size-14 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <LineChartIcon className="size-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="font-bold text-slate-900 dark:text-white text-base">Not enough sales history yet</p>
          <p className="text-xs text-slate-500 max-w-md leading-relaxed">
            Forecasts are built from this product&apos;s sales (Stock Out movements). No sales were recorded in the last
            60 days, so there&apos;s nothing to project from. Record sales through <b>Adjust Qty → Stock Out</b> and the
            forecast will appear automatically.
          </p>
          <p className="text-xs text-slate-500">
            Current stock: <b className="text-slate-900 dark:text-white">{data.available}</b> {unit} available ·{" "}
            {data.onHand} on hand
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Chart data: last 30 days actual + next N days forecast ──
  const todayKey = data.forecast[0]?.date;
  const chartRows = new Map<
    string,
    { date: string; actual?: number; forecast?: number; band?: [number, number] }
  >();
  for (const h of data.history.slice(-30)) chartRows.set(h.date, { date: h.date, actual: h.units });
  for (const f of data.forecast.slice(0, horizon)) {
    const row = chartRows.get(f.date) ?? { date: f.date };
    row.forecast = f.predicted;
    row.band = [f.lower, f.upper];
    chartRows.set(f.date, row);
  }
  const chartData = Array.from(chartRows.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Projected available stock at the end of each forecast day.
  const projectedStock = data.forecast.reduce<number[]>((acc, f, i) => {
    const prev = i === 0 ? data.available : acc[i - 1];
    acc.push(prev - f.predicted);
    return acc;
  }, []);

  const forecastHorizonTotal = data.forecast.slice(0, horizon).reduce((s, f) => s + f.predicted, 0);
  const vsLast30 =
    stats.sold30 > 0 ? Math.round(((stats.forecast30 - stats.sold30) / stats.sold30) * 100) : null;

  const trend =
    stats.trendPct === null
      ? { label: "Not enough data", icon: <MinusIcon className="size-3.5" />, cls: "text-slate-500" }
      : stats.trendPct > 10
        ? {
            label: `Rising +${stats.trendPct}%`,
            icon: <TrendingUpIcon className="size-3.5" />,
            cls: "text-emerald-600 dark:text-emerald-400",
          }
        : stats.trendPct < -10
          ? {
              label: `Falling ${stats.trendPct}%`,
              icon: <TrendingDownIcon className="size-3.5" />,
              cls: "text-red-600 dark:text-red-400",
            }
          : {
              label: `Stable ${stats.trendPct >= 0 ? "+" : ""}${stats.trendPct}%`,
              icon: <MinusIcon className="size-3.5" />,
              cls: "text-slate-600 dark:text-slate-300",
            };

  const coverTone =
    stats.daysOfCover === null
      ? "text-slate-900 dark:text-white"
      : stats.daysOfCover <= 7
        ? "text-red-600 dark:text-red-400"
        : stats.daysOfCover <= 21
          ? "text-amber-600 dark:text-amber-400"
          : "text-emerald-600 dark:text-emerald-400";

  // ── Plain-English summary ──
  const summary: string[] = [];
  summary.push(
    `Expect about ${fmtNum(stats.forecast30)} ${unit} to sell over the next 30 days` +
      (vsLast30 !== null ? ` (${vsLast30 >= 0 ? "+" : ""}${vsLast30}% vs. the last 30 days).` : "."),
  );
  if (stats.stockoutDate) {
    summary.push(
      `At that rate the ${data.available} ${unit} available will run out around ${fmtLongDay(stats.stockoutDate)}.`,
    );
  } else if (stats.daysOfCover !== null) {
    summary.push(`Available stock covers roughly ${stats.daysOfCover} days of demand.`);
  }
  if (data.onHand > data.available) {
    summary.push(`${data.onHand - data.available} ${unit} are reserved and not counted as available.`);
  }
  if (stats.suggestedOrderQty > 0) {
    summary.push(
      `To cover the next 30 days plus safety stock (${data.safetyStock}), order about ${stats.suggestedOrderQty} ${unit}` +
        (stats.reorderByDate ? ` by ${fmtLongDay(stats.reorderByDate)}.` : "."),
    );
  } else {
    summary.push("No reorder is needed for the next 30 days.");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUpIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Demand Forecast
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
              {data.source === "model" ? (
                <Badge variant="outline" className="text-[11px] font-semibold border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5">
                  ML model · {data.modelUsed}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[11px] font-semibold border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/5">
                  Sales baseline
                </Badge>
              )}
              {data.confidence !== null && <span>{Math.round(data.confidence * 100)}% confidence</span>}
              <span>· based on {stats.activeSalesDays} selling days in the last 60</span>
              {data.source === "model" && data.generatedAt && (
                <span>· updated {new Date(data.generatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
              )}
            </CardDescription>
          </div>
          {canRunForecast && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRun}
              disabled={running}
              className="rounded-xl text-xs font-semibold shrink-0"
              title="Re-run the ML forecasting model for all products in this workspace"
            >
              <RefreshCwIcon className={`size-3.5 mr-1.5 ${running ? "animate-spin" : ""}`} />
              {running ? "Running…" : "Run ML forecast"}
            </Button>
          )}
        </CardHeader>
        {data.source === "baseline" && (
          <CardContent className="pt-0">
            <p className="text-xs text-slate-500 flex items-start gap-1.5">
              <InfoIcon className="size-3.5 mt-0.5 shrink-0" />
              No ML forecast is stored for this product yet, so this projection uses its recent average daily sales,
              adjusted for weekday patterns. The ML model needs at least 5 selling days.
            </p>
          </CardContent>
        )}
      </Card>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi
          label="Next 7 days"
          value={`${fmtNum(stats.forecast7)}`}
          unit={unit}
          footer={
            <span className="text-slate-500">
              Last 7 days sold: <b className="text-slate-900 dark:text-white">{stats.sold7}</b>
            </span>
          }
          icon={<SparklesIcon className="size-4" />}
          iconCls="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
        />
        <Kpi
          label="Next 30 days"
          value={`${fmtNum(stats.forecast30)}`}
          unit={unit}
          footer={
            <span className={`flex items-center gap-1 font-semibold ${trend.cls}`}>
              {trend.icon} {trend.label}
              <span className="font-normal text-slate-500">· 14-day sales trend</span>
            </span>
          }
          icon={<LineChartIcon className="size-4" />}
          iconCls="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        />
        <Kpi
          label="Stock cover"
          value={stats.daysOfCover === null ? "—" : `${stats.daysOfCover}`}
          unit={stats.daysOfCover === null ? "" : "days"}
          valueCls={coverTone}
          footer={
            <span className="text-slate-500">
              {stats.stockoutDate ? (
                <>
                  Runs out ~<b className="text-slate-900 dark:text-white">{fmtLongDay(stats.stockoutDate)}</b>
                </>
              ) : (
                <>
                  <b className="text-slate-900 dark:text-white">{data.available}</b> {unit} available
                </>
              )}
            </span>
          }
          icon={<CalendarClockIcon className="size-4" />}
          iconCls="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
        <Kpi
          label="Suggested order"
          value={stats.suggestedOrderQty > 0 ? `${stats.suggestedOrderQty}` : "None"}
          unit={stats.suggestedOrderQty > 0 ? unit : ""}
          valueCls={stats.suggestedOrderQty > 0 ? "text-slate-900 dark:text-white" : "text-emerald-600 dark:text-emerald-400"}
          footer={
            <span className="text-slate-500">
              {stats.reorderByDate ? (
                <>
                  Hits reorder point ({data.reorderPoint}) ~
                  <b className="text-slate-900 dark:text-white">
                    {stats.reorderByDate === todayKey ? "now" : fmtLongDay(stats.reorderByDate)}
                  </b>
                </>
              ) : (
                <>Stays above reorder point ({data.reorderPoint})</>
              )}
            </span>
          }
          icon={stats.suggestedOrderQty > 0 ? <ShoppingCartIcon className="size-4" /> : <PackageCheckIcon className="size-4" />}
          iconCls="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* ── Chart ── */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Sales vs. forecast</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Last 30 days of actual sales, then the next {horizon} days forecast ({fmtNum(Math.round(forecastHorizonTotal * 10) / 10)} {unit})
            </CardDescription>
          </div>
          <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800/70 p-1 gap-1 self-start sm:self-auto">
            {HORIZONS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h)}
                aria-pressed={horizon === h}
                className={`px-3 h-7 rounded-md text-xs font-semibold transition-colors ${
                  horizon === h
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {h}D
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
            <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={28}
                tickFormatter={fmtDay}
              />
              <YAxis tickLine={false} axisLine={false} width={44} allowDecimals={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const d = payload?.[0]?.payload?.date as string | undefined;
                      return d ? fmtLongDay(d) : "";
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              {todayKey && (
                <ReferenceLine
                  x={todayKey}
                  stroke="currentColor"
                  className="text-slate-400"
                  strokeDasharray="4 4"
                  label={{ value: "Today", position: "insideTopRight", fontSize: 11, fill: "currentColor" }}
                />
              )}
              <Area
                dataKey="band"
                type="monotone"
                fill="var(--color-band)"
                fillOpacity={0.45}
                stroke="none"
                activeDot={false}
                isAnimationActive={false}
              />
              <Bar dataKey="actual" fill="var(--color-actual)" radius={[3, 3, 0, 0]} maxBarSize={14} />
              <Line
                dataKey="forecast"
                type="monotone"
                stroke="var(--color-forecast)"
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* ── Summary ── */}
        <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <SparklesIcon className="size-4 text-indigo-600 dark:text-indigo-400" /> What this means
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {summary.map((line, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  <span className="mt-1.5 size-1.5 rounded-full bg-indigo-500 shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-500">Avg. daily sales (30d)</p>
                <p className="font-bold text-slate-900 dark:text-white">
                  {fmtNum(stats.avgDaily30)} {unit}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Sold last 30 days</p>
                <p className="font-bold text-slate-900 dark:text-white">
                  {stats.sold30} {unit}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Daily table ── */}
        <Card className="lg:col-span-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Daily forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-100/90 dark:bg-slate-800/90">
                  <tr className="h-9">
                    <th className="text-left px-3 font-bold text-slate-700 dark:text-slate-300">Date</th>
                    <th className="text-right px-3 font-bold text-slate-700 dark:text-slate-300">Forecast</th>
                    <th className="text-right px-3 font-bold text-slate-700 dark:text-slate-300">Likely range</th>
                    <th className="text-right px-3 font-bold text-slate-700 dark:text-slate-300 hidden sm:table-cell">
                      Projected stock
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.forecast.slice(0, showAllRows ? undefined : 7).map((f, i) => {
                      const proj = Math.max(0, Math.round(projectedStock[i]));
                      const projCls =
                        proj <= 0
                          ? "text-red-600 dark:text-red-400 font-bold"
                          : proj <= data.reorderPoint
                            ? "text-amber-600 dark:text-amber-400 font-semibold"
                            : "text-slate-600 dark:text-slate-300";
                      return (
                        <tr key={f.date} className="border-t border-slate-100 dark:border-slate-800/80 h-9">
                          <td className="px-3 text-slate-700 dark:text-slate-300 font-medium">
                            {i === 0 ? "Today" : fmtLongDay(f.date)}
                          </td>
                          <td className="px-3 text-right font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                            {fmtNum(f.predicted)}
                          </td>
                          <td className="px-3 text-right text-slate-500 tabular-nums">
                            {fmtNum(f.lower)} – {fmtNum(f.upper)}
                          </td>
                          <td className={`px-3 text-right tabular-nums hidden sm:table-cell ${projCls}`}>{proj}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            {data.forecast.length > 7 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllRows((v) => !v)}
                className="mt-2 h-8 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
              >
                {showAllRows ? "Show first 7 days" : `Show all ${data.forecast.length} days`}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  unit,
  footer,
  icon,
  iconCls,
  valueCls = "text-slate-900 dark:text-white",
}: {
  label: string;
  value: string;
  unit: string;
  footer: React.ReactNode;
  icon: React.ReactNode;
  iconCls: string;
  valueCls?: string;
}) {
  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
      <CardHeader className="pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            {label}
          </CardDescription>
          <div className={`p-2 rounded-xl ${iconCls}`}>{icon}</div>
        </div>
        <CardTitle className={`text-2xl font-extrabold tabular-nums tracking-tight ${valueCls}`}>
          {value} {unit && <span className="text-sm font-semibold text-slate-500">{unit}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-xs">{footer}</CardContent>
    </Card>
  );
}
