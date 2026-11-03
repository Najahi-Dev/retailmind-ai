// lib/server/request.ts
// Server-only helpers shared by Next.js route handlers and the proxy.
import { ConvexHttpClient } from "convex/browser";
import { ConvexError } from "convex/values";

/**
 * Best-effort client IP. On Vercel `x-real-ip` / the first `x-forwarded-for`
 * entry are set by the platform edge and cannot be spoofed by the client.
 * If you self-host behind another proxy, make sure it overwrites these headers.
 */
export function getClientIp(req: Request): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return "unknown";
}

export function getConvexServerClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  return new ConvexHttpClient(url);
}

/** Shared secret proving a Convex call comes from this trusted server. */
export function serverSecret(): string {
  const s = process.env.AUTH_SERVER_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SERVER_SECRET must be set (>= 32 chars) in the Next.js environment");
  }
  return s;
}

/** Converts a Convex error into a safe {status, message} for API responses. */
export function convexErrorResponse(err: unknown, fallback = "Request failed"): {
  status: number;
  message: string;
  /** Present for 429s: milliseconds until the caller may retry. */
  retryAfterMs?: number;
} {
  if (err instanceof ConvexError) {
    const data = err.data as any;
    if (data && typeof data === "object" && data.code === "RATE_LIMITED") {
      const retryAfterMs =
        typeof data.retryAfterMs === "number" && data.retryAfterMs > 0 ? Math.ceil(data.retryAfterMs) : undefined;
      return { status: 429, message: String(data.message ?? "Too many requests"), retryAfterMs };
    }
    if (typeof data === "string") {
      if (data === "Forbidden") return { status: 403, message: "Forbidden" };
      return { status: 400, message: data };
    }
    if (data && typeof data.message === "string") return { status: 400, message: data.message };
  }
  console.error(err);
  return { status: 500, message: fallback };
}

/**
 * CSRF defence for cookie-authenticated state-changing endpoints: the request
 * must come from our own origin.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) {
    // Non-browser clients omit Origin; browsers always send it on cross-site POSTs.
    const site = req.headers.get("sec-fetch-site");
    return !site || site === "same-origin" || site === "none";
  }
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
