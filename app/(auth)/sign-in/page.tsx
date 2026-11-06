"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth, AuthRequestError } from "@/lib/auth-context";
import { useRetryCountdown, stripRetrySuffix } from "@/hooks/use-retry-countdown";
import { RetryNotice } from "@/components/auth/retry-notice";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  LockIcon,
  MailIcon,
  Loader2Icon,
  AlertCircleIcon,
  ShieldCheckIcon,
  ClockIcon,
  ArrowLeft,
  BuildingIcon,
} from "lucide-react";

type Workspace = { name: string; slug: string; logoUrl: string | null };

const ROLE_DESTINATIONS: Record<string, string> = {
  super_admin: "/super-admin",
  admin: "/dashboard",
  manager: "/dashboard",
  staff: "/inventory",
  supplier: "/reorders/purchase-orders",
};

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}

function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceParam = searchParams.get("workspace")?.slice(0, 48) || null;
  const resetDone = searchParams.get("reset") === "success";
  const { login, currentUser, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    resetDone ? "Your password has been updated. Sign in with your new password." : null,
  );
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [limitMessage, setLimitMessage] = useState("Too many requests.");
  const retry = useRetryCountdown();
  const [checkingWorkspace, setCheckingWorkspace] = useState(!!workspaceParam);

  // Workspace-scoped sign-in (?workspace=<slug>, set by /find-workspace): re-verify it.
  useEffect(() => {
    const slug = workspaceParam;
    if (!slug) return;
    let cancelled = false;
    fetch("/api/auth/workspace", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: slug }),
    })
      .then(async (res) => {
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.workspace) {
          setWorkspace(data.workspace);
        } else if (res.status === 404) {
          router.replace(`/find-workspace?notfound=${encodeURIComponent(slug)}`);
        } else {
          // Rate-limited or transient error: keep the slug; the server re-checks it at sign-in.
          setWorkspace({ name: slug, slug, logoUrl: null });
        }
      })
      .catch(() => {
        if (!cancelled) setWorkspace({ name: slug, slug, logoUrl: null });
      })
      .finally(() => {
        if (!cancelled) setCheckingWorkspace(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router, workspaceParam]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("suspended=true")) {
      setShowSuspendedModal(true);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated && currentUser) {
      let destination = ROLE_DESTINATIONS[currentUser.role] ?? "/dashboard";
      if (currentUser.role === "super_admin") {
        destination = "/super-admin";
      }
      // Honour ?next= only for same-site relative paths (prevents open redirects).
      const next = new URLSearchParams(window.location.search).get("next");
      if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) {
        destination = next;
      }
      router.replace(destination);
    }
  }, [authLoading, isAuthenticated, currentUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await login(email, password, workspace?.slug);
    } catch (err: any) {
      if (err instanceof AuthRequestError && err.status === 429 && err.retryAfterMs) {
        setLimitMessage(stripRetrySuffix(err.message));
        retry.start(err.retryAfterMs);
        setLoading(false);
        return;
      }
      let msg = err?.message || "Authentication failed. Please try again.";
      msg = msg
        .replace(/\[CONVEX.*?\]\s*/g, "")
        .replace(/Server Error\s*/g, "")
        .replace(/Uncaught Error:\s*/g, "")
        .replace(/Uncaught ConvexError:\s*/g, "")
        .replace(/at handler \(.*?\)/g, "")
        .trim();

      if (
        msg.includes("Waiting for the admin approval") ||
        msg.includes("pending administrator role") ||
        msg.includes("not assigned")
      ) {
        setShowPendingModal(true);
        setError(null);
      } else {
        setError(msg || "Authentication failed. Please try again.");
      }
      setLoading(false);
    }
  };

  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden py-12 px-4">
      {/* Background Animated Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1.2px,transparent_1.2px)] [background-size:36px_36px] opacity-[0.15] dark:opacity-[0.25]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_35%_35%_at_25%_25%,rgba(79,70,229,0.14),transparent_70%),radial-gradient(ellipse_35%_35%_at_75%_75%,rgba(147,51,234,0.12),transparent_70%)] dark:bg-[radial-gradient(ellipse_35%_35%_at_25%_25%,rgba(79,70,229,0.2),transparent_70%),radial-gradient(ellipse_35%_35%_at_75%_75%,rgba(147,51,234,0.16),transparent_70%)]" />
              </div>

      {/* Top Floating Back Button */}
      <div className="fixed top-6 left-6 z-50">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm text-xs font-semibold gap-1.5"
        >
          <Link
            href="/"
            onClick={(e) => {
              if (typeof window !== "undefined" && window.history.state && window.history.state.idx > 0) {
                e.preventDefault();
                router.back();
              }
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
        </Button>
      </div>

      {/* Top Floating Theme Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <ModeToggle />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 sm:max-w-md w-[95vw] sm:w-full w-full">
        <Logo size="lg" href="/" layout="vertical" />

        <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
              Welcome Back <ShieldCheckIcon className="w-5 h-5 text-indigo-500" />
            </h1>
            {workspace ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 pl-1 pr-3 py-1 text-xs text-indigo-700 dark:text-indigo-300 max-w-full">
                <span className="size-6 rounded-full bg-white dark:bg-slate-800 border border-indigo-500/20 flex items-center justify-center overflow-hidden shrink-0 text-[11px] font-bold">
                  {workspace.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={workspace.logoUrl} alt="" className="size-full object-cover" />
                  ) : (
                    workspace.name.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="truncate">
                  Signing in to <span className="font-bold">{workspace.name}</span>
                </span>
                <Link href="/find-workspace" className="font-semibold underline-offset-2 hover:underline shrink-0">
                  Change
                </Link>
              </div>
            ) : checkingWorkspace ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                <Loader2Icon className="w-3.5 h-3.5 animate-spin" /> Verifying workspace...
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sign in to RetailMind AI Supermarket Management
              </p>
            )}
          </div>

          {successMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2.5">
              <ShieldCheckIcon className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {retry.active && <RetryNotice message={limitMessage} label={retry.label} />}

          {error && !retry.active && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-2.5">
              <AlertCircleIcon className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</Label>
              <div className="relative">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@retailmind.com"
                  required
                  className="h-11 text-xs rounded-xl pl-10 border-slate-200 dark:border-slate-800"
                />
                <MailIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11 text-xs rounded-xl pl-10 border-slate-200 dark:border-slate-800"
                />
                <LockIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || authLoading || checkingWorkspace || retry.active}
              className="w-full h-11 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md mt-2"
            >
              {loading ? (
                <>
                  <Loader2Icon className="w-4 h-4 mr-2 animate-spin" /> Signing In...
                </>
              ) : retry.active ? (
                <span className="tabular-nums">Try again in {retry.label}</span>
              ) : (
                "Sign In to Platform"
              )}
            </Button>
          </form>

          {!workspace && (
            <Link
              href="/find-workspace"
              className="flex items-center justify-center gap-1.5 w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-indigo-500/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <BuildingIcon className="w-4 h-4" />
              Find your workspace
            </Link>
          )}

          <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800/60">
            <Link
              href="/"
              onClick={(e) => {
                if (typeof window !== "undefined" && window.history.state && window.history.state.idx > 0) {
                  e.preventDefault();
                  router.back();
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── PENDING APPROVAL POPUP MODAL ── */}
      <Dialog open={showPendingModal} onOpenChange={setShowPendingModal}>
        <DialogContent className="rounded-2xl border-slate-200 dark:border-slate-800 sm:max-w-md w-[95vw] sm:w-full text-center p-6 space-y-4 shadow-2xl">
          <div className="mx-auto size-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <ClockIcon className="w-7 h-7 animate-pulse" />
          </div>

          <div className="space-y-1">
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Pending Admin Approval
            </DialogTitle>
            <DialogDescription className="text-xs text-amber-600 dark:text-amber-400 font-bold pt-1">
              Your user role is not assigned. Waiting for the admin approval.
            </DialogDescription>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
            Thank you for registering with RetailMind AI. A system administrator or manager must review your registration and assign your account role (Administrator, Store Manager, Staff, or Supplier) before you can sign in to the platform.
          </p>

          <DialogFooter className="pt-2 sm:justify-center">
            <Button
              onClick={() => setShowPendingModal(false)}
              className="w-full rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white border-0 py-2.5 shadow-md"
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ACCOUNT SUSPENDED POPUP MODAL ── */}
      <Dialog open={showSuspendedModal} onOpenChange={setShowSuspendedModal}>
        <DialogContent className="rounded-2xl border-amber-200 dark:border-amber-900/50 sm:max-w-md w-[95vw] sm:w-full text-center p-6 space-y-4 shadow-2xl bg-white dark:bg-slate-900">
          <div className="mx-auto size-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
            <AlertCircleIcon className="w-7 h-7 animate-pulse text-amber-500" />
          </div>

          <div className="space-y-1">
            <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-white">
              Account Suspended
            </DialogTitle>
            <DialogDescription className="text-xs text-amber-600 dark:text-amber-400 font-bold pt-1">
              Your account has been suspended by a system administrator.
            </DialogDescription>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/20">
            For security reasons, your active session has been immediately invalidated and you have been logged out of RetailMind AI. Please contact your store manager or system administrator to resolve account access.
          </p>

          <DialogFooter className="pt-2 sm:justify-center">
            <Button
              onClick={() => {
                setShowSuspendedModal(false);
                if (typeof window !== "undefined") {
                  window.history.replaceState({}, document.title, window.location.pathname);
                }
              }}
              className="w-full rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white border-0 py-2.5 shadow-md"
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
