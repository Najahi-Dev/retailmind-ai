"use client";
// Keeps the landing page light: on "/" the app providers (Convex realtime client,
// AuthProvider, OrgProvider, tooltips, toasts) are neither rendered nor downloaded.
// Every other route gets them via a code-split chunk.
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const AppProviders = dynamic(() => import("@/lib/app-providers"));

/** Routes that render without the app providers. Keep this list to truly static pages. */
const LIGHTWEIGHT_ROUTES = new Set(["/"]);

export function AppProvidersGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (LIGHTWEIGHT_ROUTES.has(pathname)) return <>{children}</>;
  return <AppProviders>{children}</AppProviders>;
}

const CookieConsent = dynamic(
  () => import("@/components/cookie-consent").then((m) => m.CookieConsent),
  { ssr: false },
);

/** Mounts the cookie banner once the browser is idle, so it never competes with first paint. */
export function DeferredCookieConsent() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 3000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, []);
  return ready ? <CookieConsent /> : null;
}
