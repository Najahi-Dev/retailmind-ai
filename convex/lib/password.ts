// convex/lib/password.ts
import { ConvexError } from "convex/values";

/** Shared password policy for registration, password change and admin-created users. */
export function validatePasswordStrength(password: string) {
  if (password.length < 10) throw new ConvexError("Password must be at least 10 characters long.");
  if (password.length > 128) throw new ConvexError("Password is too long.");
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new ConvexError("Password must contain upper-case, lower-case letters and a number.");
  }
}
