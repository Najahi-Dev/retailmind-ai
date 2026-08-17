// app/(dashboard)/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useWorkspaceBilling } from "@/hooks/useWorkspaceBilling";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import {
  CreditCard,
  Building2,
  Database,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Settings2,
  SearchIcon,
  Copy,
  Bell,
  Smartphone,
  TestTube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth, useRole } from "@/lib/auth-context";
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  type PushPermissionStatus,
} from "@/lib/push-notifications";

export default function SettingsPage() {
  const { currentUser, token } = useAuth();
  const { isStaff, isSupplier } = useRole();
  const isRestrictedUser = isStaff || isSupplier;
  const {
    organization: org,
    tier,
    planConfig,
    isSubscribed,
    isTrialExpired,
    daysRemaining,
    trialEndsFormatted,
    nextBillingFormatted,
    isAdmin,
  } = useWorkspaceBilling();

  const [searchQuery, setSearchQuery] = useState("");

  // ── Push Notification State ──
  const [pushPermission, setPushPermission] = useState<PushPermissionStatus>("unsupported");
  const [requestingPush, setRequestingPush] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);

  const savePreferences = useMutation(api.alerts.saveNotificationPreferences);
  const userPrefs = useQuery(api.alerts.getUserPreferences, { token: token ?? undefined });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPushPermission(getNotificationPermission());
    }
  }, []);

  useEffect(() => {
    if (userPrefs?.channels) {
      setPushEnabled((userPrefs.channels as any).push ?? true);
    }
  }, [userPrefs]);

  const handleRequestPush = async () => {
    if (!isPushSupported()) {
      toast.error("Push notifications not supported in this browser.");
      return;
    }
    setRequestingPush(true);
    try {
      const result = await requestNotificationPermission();
      setPushPermission(result);
      if (result === "granted") {
        toast.success("✅ Push notifications enabled! You'll now get desktop alerts.");
        setPushEnabled(true);
        await savePreferences({
          token: token ?? undefined,
          preferences: {
            alertTypes: userPrefs?.alertTypes,
            channels: { ...(userPrefs?.channels || {}), push: true },
            thresholds: userPrefs?.thresholds,
          },
        });
      } else if (result === "denied") {
        toast.error("Notifications blocked. Allow in browser site settings.");
        setPushEnabled(false);
      }
    } catch {
      toast.error("Failed to request push permission.");
    } finally {
      setRequestingPush(false);
    }
  };

  const handleTogglePush = async (enabled: boolean) => {
    setPushEnabled(enabled);
    try {
      await savePreferences({
        token: token ?? undefined,
        preferences: {
          alertTypes: userPrefs?.alertTypes,
          channels: { ...(userPrefs?.channels || {}), push: enabled },
          thresholds: userPrefs?.thresholds,
        },
      });
      toast.success(enabled ? "Push notifications enabled." : "Push notifications disabled.");
    } catch {
      toast.error("Failed to save push notification preference.");
    }
  };

  const handleTestPush = () => {
    if (pushPermission !== "granted") {
      toast.warning("Enable push notifications first.");
      return;
    }
    const sent = sendTestNotification();
    if (sent) {
      toast.success("🔔 Test notification sent! Check your desktop.");
    } else {
      toast.error("Could not send test notification.");
    }
  };

  const copyInviteCode = () => {
    if (!org?.inviteCode) return;
    navigator.clipboard.writeText(org.inviteCode);
    toast.success("Workspace Invite Code copied to clipboard!");
  };

  const SETTINGS_SECTIONS = [
    {
      id: "billing",
      adminOnly: true,
      title: "Billing & Plans",
      subtitle: "Stripe payment portal, plan upgrades, and invoice history",
      desc: "Manage your workspace subscription tier, update credit cards, download official receipts, or upgrade to Growth Plan.",
      icon: CreditCard,
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      borderColor: "hover:border-emerald-500/40",
      badge: planConfig.displayName,
      badgeStyle: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      actionText: "Open Billing & Plans",
      actionHref: "/settings/billing",
      btnClass: "border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
    },
    {
      id: "backup",
      adminOnly: true,
      title: "Database Backup",
      subtitle: "Workspace data archives, JSON table exports, and maintenance",
      desc: "Generate instant JSON and CSV database backups for products, inventory stock movements, supplier catalogs, and purchase orders.",
      icon: Database,
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      borderColor: "hover:border-amber-500/40",
      badge: "Admin Tool",
      badgeStyle: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      actionText: "Open Database Backup",
      actionHref: "/settings/backup",
      btnClass: "border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-300",
    },
    {
      id: "workspace",
      adminOnly: true,
      title: "Workspace Details",
      subtitle: "Active organization configuration and team access code",
      desc: `Workspace: ${org?.name || "RetailMind Supermarket"} (Slug: /${org?.slug || "main"}). Share invite code to onboard staff.`,
      icon: Building2,
      iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
      borderColor: "hover:border-indigo-500/40",
      badge: org?.slug ? `/${org.slug}` : "Main",
      badgeStyle: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      actionText: "Copy Workspace Code",
      actionOnClick: copyInviteCode,
      btnClass: "border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300",
    },
    {
      id: "team",
      adminOnly: true,
      title: "Team & Staff Accounts",
      subtitle: "Manage user access permissions and staff member roles",
      desc: "Invite store managers, inventory staff, cashiers, and vendor suppliers with role-based access control (RBAC).",
      icon: Users,
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      borderColor: "hover:border-blue-500/40",
      badge: "RBAC Controls",
      badgeStyle: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      actionText: "Manage Team Members",
      actionHref: "/users",
      btnClass: "border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-300",
    },
  ];

  const filteredSections = SETTINGS_SECTIONS.filter((s) => {
    // Hide admin-only sections from non-admins
    if (!isAdmin && s.adminOnly) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:p-5 w-full">
      {/* ── 1. HERO HEADER BANNER (MATCHING GET HELP PAGE) ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5">
                <Settings2 className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                Workspace Settings & Preferences
              </Badge>
              {isSubscribed ? (
                <Badge className="text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  Active {planConfig.displayName}
                </Badge>
              ) : (
                <Badge className="text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5">
                  <Clock className="w-3.5 h-3.5 mr-1 text-amber-400" />
                  14-Day Free Trial ({daysRemaining}d remaining)
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Workspace Settings & Preferences, {currentUser?.name?.split(" ")[0] || "Admin"}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Configure organization parameters, monitor active subscription tier & Stripe billing, manage team permissions, and download database backups.
            </p>

            {/* Search Input Bar */}
            <div className="relative pt-2 max-w-xl">
              <SearchIcon className="w-4 h-4 absolute left-3.5 top-[22px] text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings, billing plans, team accounts, database backup..."
                className="pl-10 h-11 text-xs rounded-xl bg-slate-950/70 border-indigo-500/30 text-white placeholder:text-slate-400 focus:border-indigo-400 shadow-inner"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Manage Billing Quick Trigger — admin only */}
            {isAdmin && (
              <Link href="/settings/billing">
                <Button className="h-10 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-4 shadow-lg border-0 cursor-pointer">
                  <CreditCard className="w-4 h-4 mr-2 text-emerald-300" />
                  Manage Billing & Plans
                </Button>
              </Link>
            )}

            {/* Database Backup Quick Trigger — admin only */}
            {isAdmin && (
              <Link href="/settings/backup">
                <Button
                  variant="ghost"
                  className="h-10 rounded-xl text-xs font-semibold text-white hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-4 cursor-pointer transition-colors"
                >
                  <Database className="w-4 h-4 mr-2 text-amber-300" />
                  Database Backup
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. SUBSCRIPTION & PLAN STATUS CARD ── */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                <CreditCard className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                  Subscription & Plan Status
                  {isSubscribed ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold px-2.5 py-0.5">
                      <CheckCircle2 className="size-3.5 mr-1 text-emerald-600 dark:text-emerald-400" /> Active Subscription
                    </Badge>
                  ) : isTrialExpired ? (
                    <Badge variant="destructive" className="text-xs font-bold px-2.5 py-0.5">
                      <AlertCircle className="size-3.5 mr-1" /> Trial Expired
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 text-xs font-bold px-2.5 py-0.5">
                      <Clock className="size-3.5 mr-1 text-amber-600 dark:text-amber-400" /> 14-Day Free Trial
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Current tier, billing entitlement, and active workspace capabilities.
                </CardDescription>
              </div>
            </div>

            {/* Manage Billing button — admin only */}
            {isAdmin && (
              <Link href="/settings/billing">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm gap-1.5 cursor-pointer">
                  Manage Billing <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Current Plan
              </span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white capitalize flex items-center gap-1.5">
                <Sparkles className="size-4 text-indigo-600 dark:text-indigo-400" />
                {planConfig.displayName}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                {isSubscribed ? "Next Billing Cycle" : "Trial Period Remaining"}
              </span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                {isSubscribed
                  ? nextBillingFormatted
                  : daysRemaining > 0
                  ? `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left (until ${trialEndsFormatted})`
                  : planConfig.billingCycle}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                SKU Capacity
              </span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                {planConfig.skuLabel}
              </span>
            </div>
          </div>

          {!isSubscribed && !isRestrictedUser && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 font-medium">
                <Clock className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Your workspace is currently on a <strong>14-Day Free Trial</strong>. Complete payment to activate Growth Plan with unlimited SKUs and automated AI Forecasting.
                </span>
              </div>
              <Link href="/select-plan">
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg px-4 border-none shadow-xs shrink-0 cursor-pointer">
                  Upgrade & Subscribe Now
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 3. PUSH NOTIFICATION TOGGLE CARD ── */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/30">
                <Bell className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                  Push Notifications
                  {pushPermission === "granted" && pushEnabled ? (
                    <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30 text-xs font-bold px-2.5 py-0.5">
                      <CheckCircle2 className="size-3.5 mr-1 text-violet-600 dark:text-violet-400" /> Active
                    </Badge>
                  ) : pushPermission === "denied" ? (
                    <Badge variant="destructive" className="text-xs font-bold px-2.5 py-0.5">
                      <AlertCircle className="size-3.5 mr-1" /> Blocked
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30 text-xs font-bold px-2.5 py-0.5">
                      Not Enabled
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Instant desktop &amp; mobile alerts for critical inventory events.
                </CardDescription>
              </div>
            </div>

            {pushPermission === "granted" ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleTestPush}
                className="text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 border border-violet-500/20 rounded-xl text-xs font-bold gap-1.5"
              >
                <TestTube className="size-3.5" /> Send Test
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleRequestPush}
                disabled={requestingPush || !isPushSupported()}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-sm gap-1.5 cursor-pointer"
              >
                <Bell className="size-3.5" /> Enable Push Alerts
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Toggle row */}
            <div className="flex-1 flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-3">
                <Smartphone className="size-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Browser Push Notifications</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Get real-time desktop alerts for stockouts, demand spikes, reorder suggestions, and AI events — even with the tab minimized.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (pushPermission !== "granted") {
                    handleRequestPush();
                  } else {
                    handleTogglePush(!pushEnabled);
                  }
                }}
                disabled={!isPushSupported() || requestingPush}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-1 ${
                  pushEnabled && pushPermission === "granted"
                    ? "bg-violet-600"
                    : "bg-slate-300 dark:bg-slate-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div
                  className={`size-4 rounded-full bg-white transition-transform ${
                    pushEnabled && pushPermission === "granted" ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Status message */}
          {pushPermission === "denied" && (
            <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 font-medium flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-500" />
              <span>Notifications are <strong>blocked</strong> by your browser. Click the lock icon in your browser’s address bar, set &ldquo;Notifications&rdquo; to &ldquo;Allow&rdquo;, then refresh this page.</span>
            </div>
          )}
          {pushPermission === "default" && (
            <div className="mt-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/60 text-xs text-violet-700 dark:text-violet-300 font-medium flex items-center gap-2">
              <Bell className="size-4 shrink-0 text-violet-500" />
              <span>Click <strong>"Enable Push Alerts"</strong> to grant browser notification permission. A browser prompt will appear asking for your consent.</span>
            </div>
          )}
          {pushPermission === "granted" && pushEnabled && (
            <div className="mt-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/60 text-xs text-violet-700 dark:text-violet-300 font-medium flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-violet-500" />
                <span>Push notifications are <strong>active</strong>. You’ll receive instant desktop alerts for all enabled alert types.</span>
              </div>
              <Link href="/alerts/preferences" className="text-violet-600 dark:text-violet-400 font-bold underline-offset-4 hover:underline text-[11px] shrink-0">
                Manage Alert Types
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 3. WORKSPACE MANAGEMENT MODULES GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSections.map((sec) => {
          const Icon = sec.icon;
          return (
            <Card
              key={sec.id}
              className={`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm transition-all duration-200 flex flex-col justify-between ${sec.borderColor}`}
            >
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`size-10 rounded-lg ${sec.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                        {sec.title}
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        {sec.subtitle}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={`text-[10px] font-bold px-2 py-0.5 border ${sec.badgeStyle}`}>
                    {sec.badge}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed min-h-[36px]">
                  {sec.desc}
                </p>

                {sec.actionHref ? (
                  <Link href={sec.actionHref}>
                    <Button variant="outline" size="sm" className={`w-full rounded-xl font-bold text-xs gap-1.5 cursor-pointer ${sec.btnClass}`}>
                      <Icon className="size-3.5" /> {sec.actionText}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={sec.actionOnClick}
                    className={`w-full rounded-xl font-bold text-xs gap-1.5 cursor-pointer ${sec.btnClass}`}
                  >
                    <Copy className="size-3.5" /> {sec.actionText}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
