"use client";

import React from "react";
import { Logo } from "@/components/logo";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center relative overflow-hidden transition-colors duration-300">
      <div className="absolute w-[450px] h-[450px] bg-indigo-600/15 dark:bg-indigo-600/20 rounded-full blur-[130px] animate-pulse pointer-events-none" />
      <div className="relative z-10 animate-pulse">
        <Logo size="lg" showText={false} />
      </div>
    </div>
  );
}
