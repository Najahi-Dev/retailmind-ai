"use client";
import { TimerIcon } from "lucide-react";

/** Rate-limit / lockout notice with a live "Try again in …" countdown. */
export function RetryNotice({ message, label }: { message: string; label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2.5"
    >
      <TimerIcon className="w-4 h-4 shrink-0" />
      <span>
        {message} Try again in{" "}
        <span className="font-bold tabular-nums">{label}</span>.
      </span>
    </div>
  );
}
