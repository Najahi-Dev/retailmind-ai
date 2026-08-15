// components/push-notification-watcher.tsx
"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { showBrowserNotification, isPushSupported } from "@/lib/push-notifications";

const NOTIFIED_ALERTS_KEY = "retailmind_notified_alerts";

function getNotifiedAlertIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(NOTIFIED_ALERTS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveNotifiedAlertId(id: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getNotifiedAlertIds();
    set.add(id);
    // Keep max 100 recent IDs to avoid storage bloat
    const array = Array.from(set).slice(-100);
    sessionStorage.setItem(NOTIFIED_ALERTS_KEY, JSON.stringify(array));
  } catch {}
}

const ALERT_TITLES: Record<string, string> = {
  critical_stock: "🚨 Critical Stockout Alert",
  low_stock:      "⚠️ Low Stock Warning",
  overstock:      "📦 Overstock Advisory",
  demand_spike:   "📈 AI SKU Demand Surge",
  supplier_delay: "🚚 Vendor Delivery Delay",
  system:         "⚙️ RetailMind AI System Alert",
};

export function PushNotificationWatcher() {
  const { token } = useAuth();
  const alerts = useQuery(api.alerts.getAlerts, {
    token: token ?? undefined,
    status: "unread",
  });
  const preferences = useQuery(api.alerts.getUserPreferences, {
    token: token ?? undefined,
  });

  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (!alerts || !Array.isArray(alerts) || !isPushSupported()) return;

    // Check if push notifications are allowed by browser and enabled in preferences
    const isBrowserGranted = typeof Notification !== "undefined" && Notification.permission === "granted";
    const isPushEnabledInPrefs = preferences?.channels?.push !== false;

    if (!isBrowserGranted || !isPushEnabledInPrefs) return;

    const notifiedSet = getNotifiedAlertIds();

    // On initial mount, mark existing alerts as already notified so user isn't spammed with old alerts
    if (isInitialLoadRef.current) {
      alerts.forEach((a) => notifiedSet.add(a._id));
      try {
        sessionStorage.setItem(NOTIFIED_ALERTS_KEY, JSON.stringify(Array.from(notifiedSet)));
      } catch {}
      isInitialLoadRef.current = false;
      return;
    }

    // Process new incoming alerts in real-time
    alerts.forEach((alert) => {
      if (!notifiedSet.has(alert._id) && !alert.isRead && !alert.isDismissed) {
        saveNotifiedAlertId(alert._id);

        const title = ALERT_TITLES[alert.type] || `RetailMind Alert (${alert.priority.toUpperCase()})`;
        const productName = alert.product?.name ? ` [${alert.product.name}]` : "";
        const body = `${alert.message}${productName}`;

        showBrowserNotification(title, {
          body,
          tag: alert._id,
          icon: "/logo.png",
          onClickUrl: "/alerts",
        });
      }
    });
  }, [alerts, preferences]);

  return null;
}
