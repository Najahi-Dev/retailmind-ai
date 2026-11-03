// convex/lib/serverSecret.ts
// Functions that must only be invoked by the trusted Next.js server (so that the
// client IP / user-agent they receive can be trusted for rate limiting) take a
// `serverSecret` argument compared against AUTH_SERVER_SECRET in constant time.
import { ConvexError } from "convex/values";
import { safeEqual } from "./jwt";

export function requireServerSecret(provided: string | undefined) {
  const expected = process.env.AUTH_SERVER_SECRET;
  if (!expected || expected.length < 32) {
    throw new ConvexError(
      "Server misconfiguration: AUTH_SERVER_SECRET must be set (>= 32 chars) on the Convex deployment.",
    );
  }
  if (!provided || !safeEqual(provided, expected)) {
    throw new ConvexError("Forbidden");
  }
}
