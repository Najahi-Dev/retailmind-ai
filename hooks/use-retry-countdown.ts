"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Formats seconds as "35s" or "4:05". */
export function formatRetry(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Live countdown for rate-limited (429) responses.
 *   const retry = useRetryCountdown();
 *   retry.start(data.retryAfterMs);
 *   retry.active / retry.secondsLeft / retry.label
 */
export function useRetryCountdown(onDone?: () => void) {
  const [until, setUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (until === null) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) {
        setUntil(null);
        onDoneRef.current?.();
      }
    }, 250);
    return () => clearInterval(id);
  }, [until]);

  const start = useCallback((retryAfterMs: number | undefined | null) => {
    if (!retryAfterMs || retryAfterMs <= 0) return;
    const t = Date.now();
    setNow(t);
    setUntil(t + retryAfterMs);
  }, []);

  const secondsLeft = until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
  return {
    active: until !== null && secondsLeft > 0,
    secondsLeft,
    label: formatRetry(secondsLeft),
    start,
  };
}

/** Strips a trailing "Try again in …" sentence so the UI can append a live countdown. */
export function stripRetrySuffix(message: string | null | undefined): string {
  return (message ?? "").replace(/\s*Try again in [^.]*\.?\s*$/i, "").trim() || "Too many requests.";
}
