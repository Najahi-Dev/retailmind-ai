"use client";

import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/logo";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import { ModeToggle } from "@/components/mode-toggle";
import React from "react";

export default function SignUpPage() {
  const { resolvedTheme } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden py-12 px-4 gap-8">
      {/* Background Animated Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1.2px,transparent_1.2px)] [background-size:36px_36px] opacity-[0.15] dark:opacity-[0.25]" />
        <div className="absolute top-[20%] left-[20%] w-[450px] h-[450px] rounded-full bg-indigo-600/15 dark:bg-indigo-600/20 blur-[140px] animate-float-slow" />
        <div className="absolute bottom-[20%] right-[20%] w-[450px] h-[450px] rounded-full bg-purple-600/15 dark:bg-purple-600/20 blur-[140px] animate-pulse-glow" />
      </div>

      {/* Top Floating Theme Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <ModeToggle />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md w-full">
        <Logo size="lg" href="/" />
        <SignUp
          appearance={{
            baseTheme: resolvedTheme === "dark" ? dark : undefined,
          }}
        />
      </div>
    </div>
  );
}