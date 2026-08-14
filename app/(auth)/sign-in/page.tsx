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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LockIcon,
  MailIcon,
  UserIcon,
  Loader2Icon,
  AlertCircleIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  LogInIcon,
} from "lucide-react";

const ROLE_DESTINATIONS: Record<string, string> = {
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("staff");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated && currentUser) {
      const destination = ROLE_DESTINATIONS[currentUser.role] ?? "/dashboard";
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

    try {
      if (mode === "signin") {
        await login(email, password);
      } else {
        const res = await registerUserAction({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          role,
        });

        if (res && res.token) {
          localStorage.setItem("retailmind_token", res.token);
          document.cookie = `retailmind_token=${res.token}; path=/; max-age=604800; SameSite=Lax`;
          window.location.href = ROLE_DESTINATIONS[role] ?? "/dashboard";
        }
      }
    } catch (err: any) {
      setError(err?.message || "Authentication failed. Please try again.");
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoRole: string) => {
    setEmail(demoEmail);
    setPassword("admin123");
    setMode("signin");
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

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md w-full">
        <Logo size="lg" href="/" />

        <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
              {mode === "signin" ? "Welcome Back" : "Create Account"} <ShieldCheckIcon className="w-5 h-5 text-indigo-500" />
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {mode === "signin" ? "Sign in to RetailMind AI Supermarket Management" : "Register a new user account on RetailMind AI"}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl">
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

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-2.5">
              <AlertCircleIcon className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
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

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Account Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-11 text-xs rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

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

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 text-center uppercase tracking-wider">
              Quick Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("admin@retailmind.com", "admin")}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-200 dark:border-slate-700 text-[11px] text-left transition-all"
              >
                <span className="font-bold text-indigo-600 dark:text-indigo-400 block">Admin</span>
                <span className="text-slate-500 text-[10px] block truncate">admin@retailmind.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("najinajahi1@gmail.com", "manager")}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-200 dark:border-slate-800 text-[11px] text-left transition-all"
              >
                <span className="font-bold text-purple-600 dark:text-purple-400 block">Manager</span>
                <span className="text-slate-500 text-[10px] block truncate">najinajahi1@gmail.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("mohamedashan070@gmail.com", "staff")}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-200 dark:border-slate-800 text-[11px] text-left transition-all"
              >
                <span className="font-bold text-emerald-600 dark:text-emerald-400 block">Staff</span>
                <span className="text-slate-500 text-[10px] block truncate">mohamedashan070@gmail.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("ahmednajahi2003@gmail.com", "supplier")}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-200 dark:border-slate-800 text-[11px] text-left transition-all"
              >
                <span className="font-bold text-amber-600 dark:text-amber-400 block">Supplier</span>
                <span className="text-slate-500 text-[10px] block truncate">ahmednajahi2003@gmail.com</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
