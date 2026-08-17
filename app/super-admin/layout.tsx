"use client";

import { useRole } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Activity } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SuperAdminSidebar } from "@/components/super-admin-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SystemBanners } from "@/components/system-banners";
import { Toaster } from "@/components/ui/sonner";

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400">
        <Activity className="animate-spin w-6 h-6 text-indigo-500" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <SuperAdminSidebar />
      <SidebarInset>
        <SystemBanners />
        <SiteHeader />
        <div className="flex flex-1 flex-col p-4 lg:p-6 overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
