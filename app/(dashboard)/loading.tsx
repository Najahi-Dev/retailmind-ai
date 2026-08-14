"use client";

import React from "react";
import { Logo } from "@/components/logo";

export default function DashboardLoading() {
  return (
    <div className="flex-1 min-h-[70vh] bg-slate-50 dark:bg-slate-950 flex items-center justify-center relative overflow-hidden transition-colors duration-300">
      <div className="absolute w-[350px] h-[350px] bg-indigo-600/15 dark:bg-indigo-600/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div className="relative z-10 animate-pulse">
        <Logo size="lg" showText={false} />
      </div>
    </div>
  );
}
