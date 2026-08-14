"use client";

import React, { useEffect, useState } from "react";
import { Cookie, ShieldCheck, Settings, Check, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CookieSettings {
  necessary: boolean;
  analytics: boolean;
  functional: boolean;
}

const STORAGE_KEY = "retailmind_cookie_consent_v1";

export function CookieConsent() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookieSettings>({
    necessary: true, // Always true
    analytics: true,
    functional: true,
  });

  useEffect(() => {
    // Check if consent has already been saved
    const savedConsent = localStorage.getItem(STORAGE_KEY);
    if (!savedConsent) {
      // Delay showing banner slightly for better UX
      const timer = setTimeout(() => setIsOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    // Listen for custom event to trigger preferences modal from footer or settings
    const handleOpenConsent = () => {
      setShowPreferences(true);
    };

    window.addEventListener("open-cookie-preferences", handleOpenConsent);
    return () => {
      window.removeEventListener("open-cookie-preferences", handleOpenConsent);
    };
  }, []);

  const handleAcceptAll = () => {
    const allAccepted: CookieSettings = {
      necessary: true,
      analytics: true,
      functional: true,
    };
    saveConsent(allAccepted);
  };

  const handleRejectNonEssential = () => {
    const essentialOnly: CookieSettings = {
      necessary: true,
      analytics: false,
      functional: false,
    };
    saveConsent(essentialOnly);
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
    setShowPreferences(false);
  };

  const saveConsent = (settings: CookieSettings) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...settings,
        timestamp: new Date().toISOString(),
      })
    );
    setIsOpen(false);
  };

  if (!isOpen && !showPreferences) return null;

  return (
    <>
      {/* Floating Cookie Consent Banner */}
      {isOpen && !showPreferences && (
        <div className="fixed bottom-6 left-6 right-6 md:right-auto md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 backdrop-blur-xl shadow-2xl rounded-3xl p-6 relative overflow-hidden text-slate-900 dark:text-slate-100">
            {/* Ambient Accent Glow */}
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Cookie className="w-6 h-6 animate-pulse" />
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    Cookie Privacy Choice
                  </h3>
                  <button
                    onClick={handleRejectNonEssential}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                    aria-label="Close banner"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  We use cookies and telemetry to improve your demand forecasting experience, store analytics, and secure session management.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center gap-2">
              <Button
                onClick={handleAcceptAll}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20 text-xs px-4 rounded-xl"
              >
                Accept All
              </Button>
              <Button
                onClick={handleRejectNonEssential}
                variant="outline"
                size="sm"
                className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs px-3 rounded-xl"
              >
                Essential Only
              </Button>
              <Button
                onClick={() => setShowPreferences(true)}
                variant="ghost"
                size="sm"
                className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs px-3 rounded-xl ml-auto flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" /> Preferences
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Preferences Modal */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="font-heading text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Cookie Privacy Preferences
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Customize how RetailMind AI handles cookies. Necessary cookies are required for platform security and authentication.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Category 1: Necessary */}
            <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800/80 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    Strictly Necessary
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20">
                    Always Active
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Required for user login, Clerk authentication, security tokens, and store session persistence.
                </p>
              </div>
            </div>

            {/* Category 2: Analytics & Performance */}
            <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800/80 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Analytics & Telemetry
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Helps us measure feature usage, AI demand forecast latency, and inventory dashboard metrics.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) =>
                  setPreferences({ ...preferences, analytics: e.target.checked })
                }
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer mt-1"
              />
            </div>

            {/* Category 3: Functional & Preferences */}
            <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800/80 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Functional Preferences
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Remembers your layout configuration, dark/light theme choices, and preferred dashboard views.
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.functional}
                onChange={(e) =>
                  setPreferences({ ...preferences, functional: e.target.checked })
                }
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              onClick={handleSavePreferences}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl"
            >
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
