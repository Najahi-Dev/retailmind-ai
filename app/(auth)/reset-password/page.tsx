"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CircleIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  Loader2Icon,
  LockIcon,
} from "lucide-react";
import { useRetryCountdown, stripRetrySuffix } from "@/hooks/use-retry-countdown";
import { RetryNotice } from "@/components/auth/retry-notice";

const RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: "At least 10 characters", test: (p) => p.length >= 10 },
  { label: "An upper-case letter", test: (p) => /[A-Z]/.test(p) },
  { label: "A lower-case letter", test: (p) => /[a-z]/.test(p) },
  { label: "A number", test: (p) => /[0-9]/.test(p) },
];

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPassword />
    </Suspense>
  );
}

function ResetPassword() {
  const router = useRouter();
  const params = useSearchParams();
  // Capture the token once; it is then removed from the address bar.
  const [token] = useState(() => params.get("token")?.slice(0, 128) ?? "");
  const [status, setStatus] = useState<"checking" | "valid" | "invalid">(token ? "checking" : "invalid");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState("Too many requests.");
  const retry = useRetryCountdown();

  useEffect(() => {
    if (!token) return;
    // Keep the secret token out of history / screenshots / shared URLs.
    window.history.replaceState(null, "", "/reset-password");
    let cancelled = false;
    fetch("/api/auth/reset-password", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (!cancelled) setStatus(data?.valid ? "valid" : "invalid");
      })
      .catch(() => {
        if (!cancelled) setStatus("valid"); // let the submit step report the real result
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const allRulesPass = RULES.every((r) => r.test(password));
  const matches = password.length > 0 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRulesPass) {
      setError("Your new password doesn't meet all the requirements yet.");
      return;
    }
    if (!matches) {
      setError("The passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429 && typeof data?.retryAfterMs === "number") {
        setLimitMessage(stripRetrySuffix(data.error));
        retry.start(data.retryAfterMs);
        return;
      }
      if (!res.ok) {
        setError(data?.error || "Could not reset the password. Please try again.");
        if (/invalid or has expired/i.test(data?.error ?? "")) setStatus("invalid");
        return;
      }
      router.replace("/sign-in?reset=success");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden py-12 px-4">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1.2px,transparent_1.2px)] [background-size:36px_36px] opacity-[0.15] dark:opacity-[0.25]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_35%_35%_at_25%_25%,rgba(79,70,229,0.14),transparent_70%),radial-gradient(ellipse_35%_35%_at_75%_75%,rgba(147,51,234,0.12),transparent_70%)] dark:bg-[radial-gradient(ellipse_35%_35%_at_25%_25%,rgba(79,70,229,0.2),transparent_70%),radial-gradient(ellipse_35%_35%_at_75%_75%,rgba(147,51,234,0.16),transparent_70%)]" />
              </div>
      <div className="fixed top-6 right-6 z-50">
        <ModeToggle />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 sm:max-w-md w-[95vw] sm:w-full">
        <Logo size="lg" href="/" layout="vertical" />

        <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
              Choose a new password <KeyRoundIcon className="w-5 h-5 text-indigo-500" />
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You&apos;ll be signed out on all devices after the change.
            </p>
          </div>

          {status === "checking" && (
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2 py-6">
              <Loader2Icon className="w-4 h-4 animate-spin" /> Checking your reset link...
            </p>
          )}

          {status === "invalid" && (
            <div className="space-y-4">
              <div
                role="alert"
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-2.5"
              >
                <AlertCircleIcon className="w-4 h-4 shrink-0" />
                <span>This reset link is invalid, already used, or has expired.</span>
              </div>
              <Button asChild className="w-full h-11 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500">
                <Link href="/forgot-password">Request a new link</Link>
              </Button>
            </div>
          )}

          {status === "valid" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {retry.active && <RetryNotice message={limitMessage} label={retry.label} />}

              {error && !retry.active && (
                <div
                  role="alert"
                  className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-2.5"
                >
                  <AlertCircleIcon className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  New password
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                    maxLength={128}
                    required
                    className="h-11 text-xs rounded-xl pl-10 pr-10 border-slate-200 dark:border-slate-800"
                  />
                  <LockIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {show ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                  {RULES.map((r) => {
                    const ok = r.test(password);
                    return (
                      <li
                        key={r.label}
                        className={`flex items-center gap-1.5 text-[11px] ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}
                      >
                        {ok ? <CheckCircle2Icon className="w-3.5 h-3.5" /> : <CircleIcon className="w-3.5 h-3.5" />}
                        {r.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Confirm new password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={show ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    maxLength={128}
                    required
                    className="h-11 text-xs rounded-xl pl-10 border-slate-200 dark:border-slate-800"
                  />
                  <LockIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                </div>
                {confirm.length > 0 && !matches && (
                  <p className="text-[11px] text-red-600 dark:text-red-400">Passwords don&apos;t match.</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || !allRulesPass || !matches || retry.active}
                className="w-full h-11 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2Icon className="w-4 h-4 mr-2 animate-spin" /> Updating password...
                  </>
                ) : retry.active ? (
                  <span className="tabular-nums">Try again in {retry.label}</span>
                ) : (
                  "Update password"
                )}
              </Button>
            </form>
          )}

          <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
            <Link href="/sign-in" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
