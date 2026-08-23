"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
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
  UserIcon,
  Loader2Icon,
  AlertCircleIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  LogInIcon,
  EyeIcon,
  EyeOffIcon,
  ClockIcon,
  ShieldAlertIcon,
  PhoneIcon,
} from "lucide-react";

const ROLE_DESTINATIONS: Record<string, string> = {
  super_admin: "/super-admin",
  admin: "/dashboard",
  manager: "/dashboard",
  staff: "/inventory",
  supplier: "/reorders/purchase-orders",
};

export default function SignInPage() {
  const router = useRouter();
  const { login, currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const registerUserAction = useAction(api.auth.registerUser);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [role, setRole] = useState<string>("staff");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("suspended=true")) {
      setShowSuspendedModal(true);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated && currentUser) {
      let destination = ROLE_DESTINATIONS[currentUser.role] ?? "/dashboard";
      if (currentUser.role === "super_admin" || currentUser.email === "admin@retailmind.com" || currentUser.email === "ahmednajahi2003@gmail.com") {
        destination = "/super-admin";
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

    if (mode === "signup" && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === "signin") {
        await login(email, password);
      } else {
        const res = await registerUserAction({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          phone: phone.trim() || undefined,
        });

        if (res && res.isPending) {
          setShowPendingModal(true);
          setMode("signin");
          setLoading(false);
        }
      }
    } catch (err: any) {
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
        <div className="absolute top-[20%] left-[20%] w-[450px] h-[450px] rounded-full bg-indigo-600/15 dark:bg-indigo-600/20 blur-[140px] animate-float-slow" />
        <div className="absolute bottom-[20%] right-[20%] w-[450px] h-[450px] rounded-full bg-purple-600/15 dark:bg-purple-600/20 blur-[140px] animate-pulse-glow" />
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
              {mode === "signin" ? "Welcome Back" : "Create Account"} <ShieldCheckIcon className="w-5 h-5 text-indigo-500" />
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {mode === "signin" ? "Sign in to RetailMind AI Supermarket Management" : "Register a new user account on RetailMind AI"}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-lg">
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(null); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                mode === "signin"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LogInIcon className="w-3.5 h-3.5" /> Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(null); }}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                mode === "signup"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <UserPlusIcon className="w-3.5 h-3.5" /> Create Account
            </button>
          </div>

          {successMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2.5">
              <ShieldCheckIcon className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-2.5">
              <AlertCircleIcon className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      required={mode === "signup"}
                      className="h-11 text-xs rounded-xl pl-10 border-slate-200 dark:border-slate-800"
                    />
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mobile Number</Label>
                  <div className="relative">
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+94 77 123 4567"
                      className="h-11 text-xs rounded-xl pl-10 border-slate-200 dark:border-slate-800"
                    />
                    <PhoneIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                  </div>
                </div>
              </>
            )}

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
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Password</Label>
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
              disabled={loading || authLoading}
              className="w-full h-11 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md mt-2"
            >
              {loading ? (
                <>
                  <Loader2Icon className="w-4 h-4 mr-2 animate-spin" /> {mode === "signin" ? "Signing In..." : "Creating Account..."}
                </>
              ) : mode === "signin" ? (
                "Sign In to Platform"
              ) : (
                "Create New Account"
              )}
            </Button>
          </form>

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
