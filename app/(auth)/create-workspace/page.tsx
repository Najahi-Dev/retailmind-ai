"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Building2Icon,
  UserIcon,
  MailIcon,
  PhoneIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  ArrowRightIcon,
  SparklesIcon,
  CheckCircle2Icon,
} from "lucide-react";
import { toast } from "sonner";

export default function CreateWorkspacePage() {
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const registerWorkspaceAction = useAction(api.auth.registerWorkspaceAndOwner);

  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug as company name is typed
  const handleCompanyNameChange = (val: string) => {
    setCompanyName(val);
    const autoSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(autoSlug);
  };

  const handleSlugChange = (val: string) => {
    const cleanSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
    setSlug(cleanSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Please enter your company name.");
      return;
    }
    if (!slug.trim()) {
      setError("Please specify a valid workspace address slug.");
      return;
    }
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError("Please enter work email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await registerWorkspaceAction({
        companyName: companyName.trim(),
        slug: slug.trim(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password: password.trim(),
      });

      if (res?.token) {
        loginWithToken(res.token, {
          id: res.userId,
          _id: res.userId,
          email: res.email,
          name: res.name,
          role: res.role,
        });
        toast.success(`Workspace "${companyName}" created! Please select a plan.`);
        router.replace("/select-plan");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create workspace. Please check details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between transition-colors">
      {/* Top Navbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <Logo size="sm" href="/" layout="horizontal" />
        <div className="flex items-center gap-4">
          <ModeToggle />
          <Button variant="ghost" asChild className="text-xs font-semibold">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 my-8">
        <div className="w-full sm:max-w-2xl w-[95vw] sm:w-full space-y-8">
          {/* Header Title Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-50/90 via-violet-50/90 to-purple-50/90 dark:from-indigo-950/70 dark:via-violet-950/50 dark:to-purple-950/70 border border-indigo-500/25 dark:border-indigo-500/40 shadow-sm shadow-indigo-500/10 backdrop-blur-md">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
              </span>
              <SparklesIcon className="size-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 dark:from-indigo-400 dark:via-violet-300 dark:to-purple-400 bg-clip-text text-transparent">
                START YOUR 14-DAY FREE TRIAL
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Create your workspace
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-[15px] sm:max-w-xl w-[95vw] sm:w-full mx-auto font-medium leading-relaxed">
              Streamline stock management, automated reorders &amp; POS analytics
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2">
                <span>⚠️ {error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Company name
                </Label>
                <div className="relative">
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Acme Trading"
                    value={companyName}
                    onChange={(e) => handleCompanyNameChange(e.target.value)}
                    required
                    className="h-12 px-4 rounded-xl text-sm border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Workspace Address */}
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Workspace address
                </Label>
                <div className="flex items-stretch rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                  <Input
                    id="slug"
                    type="text"
                    placeholder="acme"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    required
                    className="h-12 px-4 rounded-none border-0 text-sm font-mono focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 bg-transparent"
                  />
                  <div className="px-4 bg-slate-100 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-sm flex items-center select-none font-semibold">
                    .retailmind.ai
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium pl-1">
                  Lowercase letters, numbers and hyphens only.
                </p>
              </div>

              {/* Section Divider */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 my-6" />

              {/* Name & Work Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Your name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-12 px-4 rounded-xl text-sm border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Work email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@acmetrading.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 px-4 rounded-xl text-sm border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Mobile number
                </Label>
                <div className="relative">
                  <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+94 77 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12 pl-11 pr-4 rounded-xl text-sm border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 px-4 pr-11 rounded-xl text-sm border-slate-200 dark:border-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none p-1"
                  >
                    {showPassword ? <EyeOffIcon className="size-4.5" /> : <EyeIcon className="size-4.5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-13 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-base shadow-lg shadow-indigo-600/30 transition-all duration-200 gap-2 mt-4 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2Icon className="size-5 animate-spin" /> Provisioning Workspace...
                  </>
                ) : (
                  <>
                    Create Workspace & Start Free Trial <ArrowRightIcon className="size-4.5" />
                  </>
                )}
              </Button>
            </form>

            <div className="pt-4 text-center border-t border-slate-100 dark:border-slate-800/80">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Already have a workspace?{" "}
                <Link href="/sign-in" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60">
        © 2026 RetailMind AI. All rights reserved. Safe 256-bit SSL encrypted.
      </footer>
    </div>
  );
}
