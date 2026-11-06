"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string;
  className?: string;
  textClassName?: string;
  layout?: "horizontal" | "vertical";
}

export function Logo({
  size = "md",
  showText = true,
  href,
  className,
  textClassName,
  layout = "vertical"
}: LogoProps) {
  // Square mark; the SVG carries its own rounded tile (corner radius ≈ 22.6%).
  const markSizes = {
    sm: "h-9 w-9",
    md: "h-11 w-11",
    lg: "h-16 w-16",
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

  const isVertical = layout === "vertical";

  const content = (
    <div
      className={cn(
        "inline-flex group select-none cursor-pointer",
        isVertical ? "flex-col items-center justify-center gap-2 text-center" : "flex-row items-center gap-2.5",
        className
      )}
    >
      {/* Logo mark */}
      <img
        src="/logo.svg"
        alt="RetailMind AI"
        width={64}
        height={64}
        draggable={false}
        className={cn(
          "shrink-0 rounded-[22.6%] shadow-[0_4px_14px_-4px_rgba(79,70,229,0.55)] group-hover:shadow-[0_6px_20px_-4px_rgba(124,58,237,0.6)] group-hover:-translate-y-px transition-all duration-300",
          markSizes[size]
        )}
      />

      {showText && (
        <div className="flex items-center justify-center gap-1.5">
          <span
            className={cn(
              "font-heading font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors",
              textClassName,
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
