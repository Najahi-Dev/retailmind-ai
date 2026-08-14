"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Compass,
  LayoutDashboard,
  Package,
  TrendingUp,
  ArrowLeft,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";

export default function NotFound() {
  return (
    <div className="w-full flex-1 min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden transition-colors duration-300 mx-auto">
      {/* Ambient background glow orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-indigo-600/15 dark:bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-lg w-full text-center space-y-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 sm:p-10 rounded-xl shadow-xl relative z-10 overflow-hidden mx-auto my-auto"
      >
        {/* Glowing 404 Hero Illustration */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner relative">
            <Compass className="w-10 h-10 sm:w-12 sm:h-12 animate-spin-slow" />
            <Sparkles className="w-4 h-4 text-amber-400 absolute top-2 right-2 animate-bounce" />
          </div>
          <span className="bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-xs">
            Error 404
          </span>
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            The page or retail intelligence module you are looking for doesn't exist, has been relocated, or is temporarily unavailable.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto h-10.5 px-5 rounded-xl font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/25 border-0 border-none text-sm"
          >
            <Link href="/dashboard" className="flex items-center justify-center gap-2">
              <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto h-10.5 px-5 rounded-xl font-medium border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
          >
            <Link href="/" className="flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Return to Home
            </Link>
          </Button>
        </div>

        {/* Popular Quick Links */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
            Or Jump Straight To:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Link
              href="/inventory"
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors border border-slate-200/50 dark:border-slate-700/50"
            >
              <Package className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Inventory
            </Link>
            <Link
              href="/forecasting"
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors border border-slate-200/50 dark:border-slate-700/50"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Forecasting
            </Link>
            <Link
              href="/reorders/purchase-orders"
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors border border-slate-200/50 dark:border-slate-700/50"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Orders
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
