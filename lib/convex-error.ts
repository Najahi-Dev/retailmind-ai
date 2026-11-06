import { ConvexError } from "convex/values";

/**
 * Extracts a user-facing message from a Convex call failure.
 * A thrown ConvexError carries its message in `err.data`; `err.message` is only
 * the generic "[CONVEX ...] Server Error" wrapper.
 */
export function convexErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConvexError && typeof err.data === "string") return err.data;
  if (err instanceof Error) {
    const msg = err.message.replace(/^[\s\S]*Uncaught ConvexError:\s*/, "").split("\n")[0];
    if (msg && !/Server Error/.test(msg)) return msg;
  }
  return fallback;
}
