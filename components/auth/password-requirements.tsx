"use client";
import { CheckIcon, XIcon } from "lucide-react";

// Mirrors convex/lib/password.ts (validatePasswordStrength).
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

function passwordChecks(password: string) {
  return [
    { label: `At least ${PASSWORD_MIN_LENGTH} characters`, ok: password.length >= PASSWORD_MIN_LENGTH },
    { label: "Upper-case letter", ok: /[A-Z]/.test(password) },
    { label: "Lower-case letter", ok: /[a-z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
  ];
}

export function isPasswordValid(password: string) {
  return password.length <= PASSWORD_MAX_LENGTH && passwordChecks(password).every(c => c.ok);
}

/** Live character count and policy checklist shown under a password input. */
export function PasswordRequirements({ password }: { password: string }) {
  if (!password) return null;
  const count = password.length;
  const tooLong = count > PASSWORD_MAX_LENGTH;
  const lengthOk = count >= PASSWORD_MIN_LENGTH && !tooLong;

  return (
    <div className="mt-1.5 space-y-1" aria-live="polite">
      <p
        className={`text-[11px] font-medium tabular-nums ${
          lengthOk ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
        }`}
      >
        {count} / {PASSWORD_MIN_LENGTH} characters minimum
        {tooLong && ` (max ${PASSWORD_MAX_LENGTH})`}
      </p>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {passwordChecks(password).map(c => (
          <li
            key={c.label}
            className={`flex items-center gap-1 text-[11px] ${
              c.ok ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"
            }`}
          >
            {c.ok ? <CheckIcon className="w-3 h-3 shrink-0" /> : <XIcon className="w-3 h-3 shrink-0" />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
