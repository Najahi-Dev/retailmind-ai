"use client";

import React from "react";
import { Logo } from "@/components/logo";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300">
      <div className="absolute w-[450px] h-[450px] bg-indigo-600/20 rounded-full blur-[130px] animate-pulse pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-3 animate-pulse">
        <Logo size="lg" showText={true} textClassName="text-white drop-shadow-md" />
      </div>
    </div>
  );
}
