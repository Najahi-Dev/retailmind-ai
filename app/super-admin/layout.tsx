"use client";

import { useRole } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { ShieldAlert, Users, CreditCard, Activity, Settings, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, isLoading } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      router.push("/");
    }
  }, [isLoading, isSuperAdmin, router]);

  if (isLoading || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <Activity className="animate-spin w-6 h-6 text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <ShieldAlert className="w-6 h-6 text-red-500 mr-2" />
          <span className="font-bold text-lg text-white">Super Admin</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link href="/super-admin" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white group">
            <Activity className="w-5 h-5 mr-3 text-slate-400 group-hover:text-white" />
            Overview
          </Link>
          <Link href="/super-admin/tenants" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white group">
            <Users className="w-5 h-5 mr-3 text-slate-400 group-hover:text-white" />
            Tenants & Orgs
          </Link>
          <Link href="/super-admin/billing" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white group">
            <CreditCard className="w-5 h-5 mr-3 text-slate-400 group-hover:text-white" />
            Global Billing
          </Link>
          <Link href="/super-admin/health" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white group">
            <Activity className="w-5 h-5 mr-3 text-slate-400 group-hover:text-white" />
            System Health
          </Link>
          <Link href="/super-admin/security" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-800 hover:text-white group">
            <Settings className="w-5 h-5 mr-3 text-slate-400 group-hover:text-white" />
            Global Settings
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Return to App
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-950 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
