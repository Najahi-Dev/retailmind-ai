import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { getServerUser } from "@/lib/get-server-user";

import { TrialBanner } from "@/components/trial-banner";
import { SystemBanners } from "@/components/system-banners";
import { PushNotificationWatcher } from "@/components/push-notification-watcher";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SystemBanners />
        <SiteHeader />
        <TrialBanner />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
      <PushNotificationWatcher />
      <Toaster />
    </SidebarProvider>
  );
}