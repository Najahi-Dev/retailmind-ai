// lib/push-notifications.ts

export type PushPermissionStatus = "granted" | "denied" | "default" | "unsupported";

/**
 * Check if the current browser environment supports the Web Notifications API
 */
export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Get current browser notification permission state
 */
export function getNotificationPermission(): PushPermissionStatus {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission as PushPermissionStatus;
}

/**
 * Play a gentle synthetic chime for new notifications using the Web Audio API
 */
export function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(880, now + 0.15); // A5
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.35); // D6

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.2);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.45);
  } catch (err) {
    // Silent fail if AudioContext is blocked by browser autoplay policy
  }
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<PushPermissionStatus> {
  if (!isPushSupported()) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    return permission as PushPermissionStatus;
  } catch (err) {
    console.error("Error requesting notification permission:", err);
    return Notification.permission as PushPermissionStatus;
  }
}

export interface ShowNotificationOptions {
  body?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: any;
  silent?: boolean;
  onClickUrl?: string;
}

/**
 * Display a native browser desktop / mobile push notification
 */
export function showBrowserNotification(title: string, options?: ShowNotificationOptions) {
  if (!isPushSupported() || Notification.permission !== "granted") {
    return null;
  }

  try {
    if (!options?.silent) {
      playNotificationSound();
    }

    const notification = new Notification(title, {
      body: options?.body || "RetailMind AI System Alert",
      icon: options?.icon || "/logo.png",
      badge: options?.badge || "/logo.png",
      tag: options?.tag || `retailmind-${Date.now()}`,
      data: options?.data,
      requireInteraction: false,
    });

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (options?.onClickUrl) {
        window.location.href = options.onClickUrl;
      }
      notification.close();
    };

    return notification;
  } catch (err) {
    console.error("Failed to show browser notification:", err);
    return null;
  }
}

/**
 * Send a test push notification to verify sound and banner appearance
 */
export function sendTestNotification(): boolean {
  if (!isPushSupported()) return false;
  if (Notification.permission !== "granted") return false;

  showBrowserNotification("🔔 RetailMind AI: Push Notifications Active", {
    body: "You will now receive instant desktop alerts whenever critical inventory, stockout, or AI demand events occur!",
    tag: "test-notification",
    onClickUrl: "/alerts",
  });

  return true;
}
