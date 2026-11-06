"use client";

import React from "react";
import { Logo } from "@/components/logo";

export default function DashboardLoading() {
  return (
    <div className="flex-1 min-h-[70vh] bg-slate-950 text-white flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300 rounded-xl my-4 mx-2">
      <div className="absolute w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.2),transparent_60%)] animate-pulse pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-3 animate-pulse">
        <Logo size="lg" showText={true} textClassName="text-white drop-shadow-md" />
      </div>
    </div>
  );
}
