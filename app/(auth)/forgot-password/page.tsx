"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, KeyRoundIcon, Loader2Icon, MailIcon, AlertCircleIcon, MailCheckIcon } from "lucide-react";
import { useRetryCountdown, stripRetrySuffix } from "@/hooks/use-retry-countdown";
import { RetryNotice } from "@/components/auth/retry-notice";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState("Too many requests.");
  const retry = useRetryCountdown();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your e-mail address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429 && typeof data?.retryAfterMs === "number") {
        setLimitMessage(stripRetrySuffix(data.error));
        retry.start(data.retryAfterMs);
        return;
      }
      if (!res.ok) {
        setError(data?.error || "Could not process the request. Please try again.");
        return;
      }
      setSentMessage(data.message);
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
        <div className="absolute top-[20%] left-[20%] w-[450px] h-[450px] rounded-full bg-indigo-600/15 dark:bg-indigo-600/20 blur-[140px] animate-float-slow" />
        <div className="absolute bottom-[20%] right-[20%] w-[450px] h-[450px] rounded-full bg-purple-600/15 dark:bg-purple-600/20 blur-[140px] animate-pulse-glow" />
      </div>

      <div className="fixed top-6 left-6 z-50">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm text-xs font-semibold gap-1.5"
        >
          <Link href="/sign-in">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
        </Button>
      </div>
      <div className="fixed top-6 right-6 z-50">
        <ModeToggle />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 sm:max-w-md w-[95vw] sm:w-full">
        <Logo size="lg" href="/" layout="vertical" />

        <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
              Reset your password <KeyRoundIcon className="w-5 h-5 text-indigo-500" />
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter the e-mail you sign in with and we&apos;ll send you a reset link.
            </p>
          </div>

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

          {sentMessage ? (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-xs text-emerald-700 dark:text-emerald-400 flex gap-3">
                <MailCheckIcon className="w-5 h-5 shrink-0" />
                <span>{sentMessage}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                Didn&apos;t get it? Check your spam folder, or{" "}
                <button
                  type="button"
                  onClick={() => setSentMessage(null)}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  try again
                </button>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    autoFocus
                    required
                    className="h-11 text-xs rounded-xl pl-10 border-slate-200 dark:border-slate-800"
                  />
                  <MailIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading || retry.active}
                className="w-full h-11 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2Icon className="w-4 h-4 mr-2 animate-spin" /> Sending link...
                  </>
                ) : retry.active ? (
                  <span className="tabular-nums">Try again in {retry.label}</span>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>
          )}

          <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
            Remembered it?{" "}
            <Link href="/sign-in" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
