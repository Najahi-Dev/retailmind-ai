"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { useAuth } from "@/lib/auth-context";
import { useRole } from "@/hooks/useRole";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#about", label: "About" },
];

const primary =
  "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/30 font-medium";

/** Auth-aware navbar actions + mobile menu (the only interactive part of the header). */
export function LandingNavActions() {
  const { isAuthenticated } = useAuth();
  const { isSuperAdmin } = useRole();
  const [open, setOpen] = useState(false);
  const home = isSuperAdmin ? "/super-admin" : "/dashboard";

  const authButtons = (mobile: boolean) =>
    isAuthenticated ? (
      <Button asChild className={`${primary} ${mobile ? "w-full" : "px-5"}`}>
        <Link href={home}>
          {isSuperAdmin ? "Super Admin" : "Dashboard"} <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      </Button>
    ) : (
      <>
        {mobile ? (
          <Button variant="outline" asChild className="w-full border-slate-800 text-slate-200 hover:bg-slate-900">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        ) : (
          <Button
            variant="ghost"
            asChild
            className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <Link href="/sign-in">Sign In</Link>
          </Button>
        )}
        <Button asChild className={`${primary} ${mobile ? "w-full" : "px-5"}`}>
          <Link href="/create-workspace">Start Free Trial</Link>
        </Button>
      </>
    );

  return (
    <>
      <div className="hidden md:flex items-center gap-4">
        <ModeToggle />
        {authButtons(false)}
      </div>

      <div className="flex items-center gap-3 md:hidden">
        <ModeToggle />
        <button
          onClick={() => setOpen((o) => !o)}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 focus:outline-none"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-slate-950/95 border-b border-slate-800 px-4 pt-4 pb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col space-y-3 text-sm font-medium text-slate-300">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="hover:text-indigo-400 transition-colors py-1">
                {l.label}
              </a>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-3">{authButtons(true)}</div>
        </div>
      )}
    </>
  );
}
