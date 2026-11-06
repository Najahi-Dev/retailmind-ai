"use client";
// Lightweight "is someone signed in?" hint for public pages that must NOT load the
// Convex client / AuthProvider (landing page). Reads the short-lived, non-HttpOnly
// access-token cookie and decodes its claims WITHOUT verifying them — use only to
// pick which buttons to show. Real authorization always happens server-side.
import { useSyncExternalStore } from "react";

const ACCESS_COOKIE = "retailmind_token";

/** Returns the role of a non-expired access token, or "" (stable primitive for useSyncExternalStore). */
function readHint(): string {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${ACCESS_COOKIE}=`));
  if (!match) return "";
  try {
    const token = decodeURIComponent(match.slice(ACCESS_COOKIE.length + 1));
    const payload = JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")));
    const valid = typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
    return valid ? String(payload.role || "user") : "";
  } catch {
    return "";
  }
}

const subscribe = () => () => {};

export function useSessionHint(): { isAuthenticated: boolean; role: string | null } {
  const role = useSyncExternalStore(subscribe, readHint, () => "");
  return { isAuthenticated: role !== "", role: role || null };
}
