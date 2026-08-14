"use client";

import React from "react";
import { Logo } from "@/components/logo";

export default function DashboardLoading() {
  return (
    <div className="flex-1 min-h-[70vh] bg-slate-950 text-white flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300 rounded-xl my-4 mx-2">
      <div className="absolute w-[350px] h-[350px] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-3 animate-pulse">
        <Logo size="lg" showText={true} textClassName="text-white drop-shadow-md" />
      </div>
    </div>
  );
}
