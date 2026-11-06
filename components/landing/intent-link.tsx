"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

/**
 * <Link> that prefetches on user intent (hover / focus / touch) instead of when it
 * scrolls into view. Used on the landing page so visitors don't download the app's
 * sign-in / sign-up bundles (Convex client, framer-motion) unless they head there.
 */
export function IntentLink({ href, onMouseEnter, onFocus, onTouchStart, ...rest }: ComponentProps<typeof Link>) {
  const router = useRouter();
  const target = typeof href === "string" ? href : href.pathname ?? "/";
  const prefetch = () => {
    if (!target.startsWith("#")) router.prefetch(target);
  };
  return (
    <Link
      {...rest}
      href={href}
      prefetch={false}
      onMouseEnter={(e) => {
        prefetch();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        prefetch();
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        prefetch();
        onTouchStart?.(e);
      }}
    />
  );
}
