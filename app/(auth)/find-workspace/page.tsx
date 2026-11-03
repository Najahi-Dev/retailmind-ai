"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRightIcon,
  BuildingIcon,
  CheckCircle2Icon,
  Loader2Icon,
  AlertCircleIcon,
} from "lucide-react";
import { useRetryCountdown, stripRetrySuffix } from "@/hooks/use-retry-countdown";
import { RetryNotice } from "@/components/auth/retry-notice";

type Workspace = { name: string; slug: string; logoUrl: string | null };

/** Mirrors the server-side slug normalisation, for the live URL preview. */
function previewSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function FindWorkspacePage() {
  return (
    <Suspense>
      <FindWorkspace />
    </Suspense>
  );
}

function FindWorkspace() {
  const router = useRouter();
  // Arriving from /sign-in with an invalid ?workspace= value.
  const missing = useSearchParams().get("notfound")?.slice(0, 120) ?? null;
  const [query, setQuery] = useState(missing ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    missing ? `We couldn't find an active workspace called "${missing}".` : null,
  );
  const [found, setFound] = useState<Workspace | null>(null);
  const [limitMessage, setLimitMessage] = useState("Too many requests.");
  const retry = useRetryCountdown();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError("Enter your workspace URL or name.");
      return;
    }
    setLoading(true);
    setError(null);
    setFound(null);
    try {
      const res = await fetch("/api/auth/workspace", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429 && typeof data?.retryAfterMs === "number") {
        setLimitMessage(stripRetrySuffix(data.error));
        retry.start(data.retryAfterMs);
        return;
      }
      if (!res.ok) {
        setError(data?.error || "We couldn't verify that workspace.");
        return;
      }
      const ws: Workspace = data.workspace;
      setFound(ws);
      // Brief confirmation, then continue to the workspace-scoped sign-in.
      setTimeout(() => router.push(`/sign-in?workspace=${encodeURIComponent(ws.slug)}`), 700);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const slug = previewSlug(query);

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
              Find your workspace <BuildingIcon className="w-5 h-5 text-indigo-500" />
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your company&apos;s workspace URL or name to continue to sign in.
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

          {found ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                {found.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={found.logoUrl} alt="" className="size-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-indigo-600">
                    {found.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{found.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{found.slug}</p>
              </div>
              <CheckCircle2Icon className="w-5 h-5 text-emerald-500 shrink-0" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="workspace" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Workspace URL or name
                </Label>
                <div className="relative">
                  <Input
                    id="workspace"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="acme-supermarket"
                    autoComplete="organization"
                    autoFocus
                    maxLength={120}
                    className="h-11 text-xs rounded-xl pl-10 border-slate-200 dark:border-slate-800"
                  />
                  <BuildingIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                </div>
                {slug && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Looking for workspace: <span className="font-semibold text-slate-700 dark:text-slate-300">{slug}</span>
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || retry.active}
                className="w-full h-11 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2Icon className="w-4 h-4 mr-2 animate-spin" /> Verifying workspace...
                  </>
                ) : retry.active ? (
                  <span className="tabular-nums">Try again in {retry.label}</span>
                ) : (
                  <>
                    Continue <ArrowRightIcon className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800/60 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
            <p>
              Don&apos;t have a workspace?{" "}
              <Link href="/create-workspace" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                Create one
              </Link>
            </p>
            <p>
              <Link href="/sign-in" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                Sign in without a workspace
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
