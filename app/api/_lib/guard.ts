// app/api/_lib/guard.ts
// Shared security helpers for API route handlers (the `_lib` folder is private
// and never routed). Route handlers must NOT trust decoded JWT claims for
// authorization of data access: they pass the caller's access token to Convex,
// which re-verifies it and enforces org/role rules.
import { NextResponse } from "next/server";
import { ConvexError } from "convex/values";
import type { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getServerUser, getServerAccessToken } from "@/lib/get-server-user";
import { getClientIp, isSameOrigin, serverSecret } from "@/lib/server/request";

export type Caller = NonNullable<Awaited<ReturnType<typeof getServerUser>>>;

/** Escapes a value for safe interpolation into HTML text or attribute context. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strips CR/LF so user data can never inject extra mail headers via the subject. */
export function headerSafe(value: string, max = 200): string {
  return value.replace(/[\r\n]+/g, " ").slice(0, max);
}

export function jsonError(status: number, error: string) {
  return NextResponse.json({ success: false, error }, { status });
}

/**
 * Requires a verified caller (signature-checked access JWT) and, optionally,
 * one of `roles`. Also enforces a same-origin check (CSRF defence for
 * cookie-authenticated POSTs). Returns either the caller + raw token, or an
 * error response to return as-is.
 */
export async function requireCaller(
  req: Request,
  roles?: readonly string[],
): Promise<{ caller: Caller; token: string } | { response: NextResponse }> {
  if (!isSameOrigin(req)) {
    return { response: jsonError(403, "Forbidden") };
  }
  const caller = await getServerUser();
  const token = await getServerAccessToken();
  if (!caller || !token) {
    return { response: jsonError(401, "Unauthorized") };
  }
  if (roles && !roles.includes(caller.role)) {
    return { response: jsonError(403, "Forbidden") };
  }
  return { caller, token };
}

export function isRateLimitError(err: unknown): boolean {
  return (
    err instanceof ConvexError &&
    typeof err.data === "object" &&
    err.data !== null &&
    (err.data as { code?: unknown }).code === "RATE_LIMITED"
  );
}

/**
 * Consumes one token from the per-IP bucket and (when `userId` is given) the
 * per-user bucket for `scope`. Returns a 429 response when limited, else null.
 * The per-user bucket reuses `consumeForIp` with a `user:` key prefix so it lives
 * in a separate keyspace from IP buckets.
 */
export async function enforceRateLimit(
  client: ConvexHttpClient,
  req: Request,
  scope: string,
  userId?: string,
): Promise<NextResponse | null> {
  try {
    const secret = serverSecret();
    await client.mutation(api.rateLimits.consumeForIp, {
      serverSecret: secret,
      scope,
      ip: getClientIp(req),
      policy: "emailPerIp",
    });
    if (userId) {
      await client.mutation(api.rateLimits.consumeForIp, {
        serverSecret: secret,
        scope: `${scope}:user`,
        ip: `user:${userId}`,
        policy: "emailPerUser",
      });
    }
    return null;
  } catch (err) {
    if (isRateLimitError(err)) {
      return jsonError(429, "Too many requests. Please try again later.");
    }
    throw err;
  }
}

/**
 * True when `email` belongs to the caller, or (per `allow`) to a user / supplier
 * in the caller's organization, as reported by token-authenticated Convex
 * queries (Convex scopes these lists to the caller's org). Fails closed.
 */
export async function isAllowedRecipient(
  client: ConvexHttpClient,
  token: string,
  caller: Caller,
  email: string,
  allow: { orgUsers?: boolean; orgSuppliers?: boolean },
): Promise<boolean> {
  const target = email.trim().toLowerCase();
  if (caller.email && caller.email.toLowerCase() === target) return true;
  try {
    if (allow.orgUsers) {
      const users = await client.query(api.users.getUsers, { token });
      if (users.some((u) => (u.email ?? "").toLowerCase() === target)) return true;
    }
    if (allow.orgSuppliers) {
      const suppliers = await client.query(api.suppliers.getSuppliers, { token });
      if (suppliers.some((s) => (s.email ?? "").toLowerCase() === target)) {
        return true;
      }
    }
  } catch (err) {
    console.warn("Recipient lookup failed", err instanceof Error ? err.message : err);
  }
  return false;
}

/** Parses a JSON body; returns undefined on malformed JSON. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
