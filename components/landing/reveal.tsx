"use client";

import { useEffect, useRef } from "react";

/**
 * Lightweight scroll-reveal (replaces framer-motion `whileInView`).
 * - Content is server-rendered VISIBLE; only blocks that start off-screen are
 *   hidden after hydration, then faded in via CSS when scrolled into view.
 * - No layout reads (IntersectionObserver only) → no forced reflows.
 * - Respects prefers-reduced-motion.
 * Children are staggered by `[data-reveal] > *` rules in globals.css.
 */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let first = true;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (first) {
            first = false;
            if (entry.isIntersecting) {
              io.disconnect(); // already on screen: leave it as rendered
              return;
            }
            el.dataset.reveal = "pending";
            continue;
          }
          if (entry.isIntersecting) {
            el.dataset.reveal = "in";
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -60px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
