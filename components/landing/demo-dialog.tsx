"use client";

import { useState } from "react";
import Link from "next/link";
import { BrainCircuit, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** "Watch Demo" hero button + walkthrough dialog. */
export function WatchDemoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto border-slate-300 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-medium px-8 h-12 text-base rounded-xl gap-2"
      >
        <Play className="w-4 h-4 text-indigo-500 dark:text-indigo-400 fill-indigo-500 dark:fill-indigo-400" />
        Watch Demo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-3xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
              RetailMind AI Platform Walkthrough
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Discover how AI demand forecasting and automated purchase orders streamline supermarket operations.
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-4 relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Play className="w-8 h-8 fill-indigo-400 ml-1" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">Interactive Product Preview</h4>
              <p className="text-xs text-slate-400 mt-1 sm:max-w-md w-[95vw] sm:w-full">
                Experience real-time AI inventory tracking, automated PO generation, and 30-day demand predictions.
              </p>
            </div>
            <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-6">
              <Link href="/sign-in" onClick={() => setOpen(false)}>
                Try RetailMind AI Live
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Footer "Cookie Settings" link (re-opens the consent banner). */
export function CookieSettingsButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("open-cookie-preferences"))}
      className="hover:text-indigo-400 transition-colors text-left"
    >
      Cookie Settings
    </button>
  );
}
