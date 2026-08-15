// app/(dashboard)/alerts/preferences/PreferencesClient.tsx
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BellIcon,
  ChevronLeftIcon,
  SaveIcon,
  RefreshCwIcon,
  MailIcon,
  SlidersIcon,
  ShieldCheckIcon,
  TrendingDownIcon,
  AlertTriangleIcon,
  PackageIcon,
  InfoIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";

export default function PreferencesClient() {
  const router = useRouter();
  const { token } = useAuth();

  const userPrefs = useQuery(api.alerts.getUserPreferences, { token: token ?? undefined });
  const savePreferences = useMutation(api.alerts.saveNotificationPreferences);

  const [saving, setSaving] = useState(false);

  // Local Form State
  const [alertTypes, setAlertTypes] = useState({
    lowStock: true,
    criticalStock: true,
    overstock: true,
    demandSpike: true,
    system: true,
  });

  const [channels, setChannels] = useState({
    inApp: true,
    email: false,
  });

  const [thresholds, setThresholds] = useState({
    lowStockMultiplier: 1.0,
    criticalStockMultiplier: 1.0,
  });

  // Sync state when preferences are loaded from Convex
  useEffect(() => {
    if (userPrefs) {
      setAlertTypes(userPrefs.alertTypes);
      setChannels(userPrefs.channels);
      setThresholds(userPrefs.thresholds);
    }
  }, [userPrefs]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePreferences({
        token: token ?? undefined,
        preferences: {
          alertTypes,
          channels,
          thresholds: {
            lowStockMultiplier: Number(thresholds.lowStockMultiplier) || 1.0,
            criticalStockMultiplier: Number(thresholds.criticalStockMultiplier) || 1.0,
          },
        },
      });
      toast.success("Notification preferences saved successfully!");
    } catch (err) {
      toast.error("Failed to save notification preferences");
    } finally {
      setSaving(false);
    }
  };

  if (userPrefs === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-12 text-slate-500 font-semibold text-xs">
        <RefreshCwIcon className="animate-spin size-4 text-indigo-500" />
        Loading notification preferences...
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full max-w-4xl mx-auto">
      {/* ── HERO HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
        {/* Glow Ambient Effect */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0 size-10 rounded-lg bg-white/10 hover:bg-white/20 border-white/20 text-white"
            >
              <ChevronLeftIcon className="w-5 h-5 text-indigo-200" />
            </Button>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Notification Preferences
                </h1>
                <Badge className="text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5">
                  User Config
                </Badge>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Configure alert triggers, delivery channels, and custom inventory risk thresholds
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: ALERT TYPES ── */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BellIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Alert Types
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Enable or disable specific categories of inventory warnings and system notifications
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {[
            {
              id: "lowStock" as const,
              label: "Low Stock Alerts",
              desc: "Fires when product inventory drops below the calculated reorder point threshold.",
              icon: TrendingDownIcon,
              color: "text-orange-500",
            },
            {
              id: "criticalStock" as const,
              label: "Critical Stock Alerts",
              desc: "Fires immediately when product inventory reaches or drops below safety stock level.",
              icon: AlertTriangleIcon,
              color: "text-red-500",
            },
            {
              id: "overstock" as const,
              label: "Overstock Alerts",
              desc: "Fires when stock levels exceed 5x the optimal reorder point, tying up capital.",
              icon: PackageIcon,
              color: "text-blue-500",
            },
            {
              id: "demandSpike" as const,
              label: "Demand Spike Alerts",
              desc: "Fires when unexpected sales surges exceed baseline velocity projections.",
              icon: SlidersIcon,
              color: "text-purple-500",
            },
            {
              id: "system" as const,
              label: "System Alerts",
              desc: "Fires for system events, administrative maintenance, and audit notifications.",
              icon: InfoIcon,
              color: "text-indigo-500",
            },
          ].map((item) => {
            const Icon = item.icon;
            const isChecked = alertTypes[item.id];

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{item.label}</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{item.desc}</p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() =>
                    setAlertTypes((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-1 ${
                    isChecked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <div
                    className={`size-4 rounded-full bg-white transition-transform ${
                      isChecked ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── SECTION 2: NOTIFICATION CHANNELS ── */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MailIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Notification Channels
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Choose how you would like to receive live system alert notifications
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* In-App Notifications */}
          <div className="flex items-center justify-between gap-4 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">In-App Notifications</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Display live badge alerts and stream cards inside the RetailMind AI dashboard.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setChannels((prev) => ({ ...prev, inApp: !prev.inApp }))}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-1 ${
                channels.inApp ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div
                className={`size-4 rounded-full bg-white transition-transform ${
                  channels.inApp ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Email Notifications */}
          <div className="flex flex-col gap-2 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Email Notifications</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Receive instant critical alert summaries delivered directly to your inbox.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setChannels((prev) => ({ ...prev, email: !prev.email }))}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-1 ${
                  channels.email ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <div
                  className={`size-4 rounded-full bg-white transition-transform ${
                    channels.email ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="mt-2 bg-indigo-500/10 border border-indigo-500/20 p-2.5 rounded-xl text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-2">
              <MailIcon className="w-4 h-4 shrink-0" />
              <span>Email notifications are sent via Resend to your registered account email address.</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 3: ALERT THRESHOLDS ── */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <SlidersIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Alert Threshold Overrides
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Override the default reorder point and safety stock multipliers for alert generation
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Low Stock Threshold Multiplier
            </Label>
            <Input
              type="number"
              step="0.1"
              min="0.5"
              max="3.0"
              placeholder="1.0"
              value={thresholds.lowStockMultiplier}
              onChange={(e) =>
                setThresholds((prev) => ({
                  ...prev,
                  lowStockMultiplier: parseFloat(e.target.value) || 1.0,
                }))
              }
              className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
            />
            <p className="text-[11px] text-slate-400 font-medium">
              Default: 1.0 (Alert triggers when stock drops below product reorder point)
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Critical Stock Threshold Multiplier
            </Label>
            <Input
              type="number"
              step="0.1"
              min="0.5"
              max="3.0"
              placeholder="1.0"
              value={thresholds.criticalStockMultiplier}
              onChange={(e) =>
                setThresholds((prev) => ({
                  ...prev,
                  criticalStockMultiplier: parseFloat(e.target.value) || 1.0,
                }))
              }
              className="h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800"
            />
            <p className="text-[11px] text-slate-400 font-medium">
              Default: 1.0 (Alert triggers when stock reaches safety stock limit)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── SAVE PREFERENCES ACTION BAR ── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="h-10 rounded-lg text-xs font-semibold px-5"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-10 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-6 shadow-md border-0"
        >
          {saving ? (
            <>
              <RefreshCwIcon className="animate-spin size-4 mr-2" /> Saving...
            </>
          ) : (
            <>
              <SaveIcon className="w-4 h-4 mr-2" /> Save Notification Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
