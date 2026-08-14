"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string;
  className?: string;
}

export function Logo({
  size = "md",
  showText = true,
  href,
  className
}: LogoProps) {
  const containerSizes = {
    sm: "h-9 w-auto rounded-xl",
    md: "h-11 w-auto rounded-xl",
    lg: "h-16 w-auto rounded-2xl",
  };

  const textSizes = {
    sm: "text-sm sm:text-base",
    md: "text-base sm:text-lg",
    lg: "text-xl sm:text-2xl",
  };

  const badgeSizes = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-xs px-2.5 py-1",
  };

  const content = (
    <div className={cn("inline-flex items-center gap-2.5 group select-none cursor-pointer", className)}>
      {/* Logo Image Container */}
      <div
        className={cn(
          "relative shrink-0 flex items-center justify-center overflow-hidden border border-indigo-500/40 shadow-[0_0_18px_rgba(99,102,241,0.35)] group-hover:shadow-[0_0_24px_rgba(168,85,247,0.5)] group-hover:scale-105 transition-all duration-300 bg-slate-950 p-1",
          containerSizes[size]
        )}
      >
        <img
          src="/logo.png"
          alt="RetailMind AI Logo"
          className="h-full w-auto object-contain rounded-lg"
        />
      </div>

      {showText && (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "font-heading font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors",
              textSizes[size]
            )}
          >
            RetailMind
          </span>
          <span
            className={cn(
              "rounded-md bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-extrabold tracking-wide shadow-sm",
              badgeSizes[size]
            )}
          >
            AI
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="inline-flex">{content}</Link>;
  }

  return content;
}
