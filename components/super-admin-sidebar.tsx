"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  UsersIcon,
  CreditCardIcon,
  ActivityIcon,
  SettingsIcon,
  ArrowLeftIcon,
  ShieldAlert,
} from "lucide-react"
import { Logo } from "@/components/logo"
import { useRouter } from "next/navigation"

export function SuperAdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  
  const superAdminNav = [
    {
      title: "Overview",
      url: "/super-admin",
      icon: <ActivityIcon className="size-4" />,
    },
    {
      title: "Tenants & Orgs",
      url: "/super-admin/tenants",
      icon: <UsersIcon className="size-4" />,
    },
    {
      title: "Global Billing",
      url: "/super-admin/billing",
      icon: <CreditCardIcon className="size-4" />,
    },
    {
      title: "System Health",
      url: "/super-admin/health",
      icon: <ActivityIcon className="size-4" />,
    },
    {
      title: "Global Settings",
      url: "/super-admin/security",
      icon: <SettingsIcon className="size-4" />,
    },
  ];

  return (
    <Sidebar collapsible="offcanvas" className="border-none shadow-[4px_0_24px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.35)]" {...props}>
      <SidebarHeader className="flex flex-col border-b border-slate-200 dark:border-slate-800 p-3 gap-2">
        <SidebarMenu className="w-full">
          <SidebarMenuItem className="flex justify-center flex-col items-center">
            <div className="relative flex items-center justify-center w-full py-0.5">
              <Logo size="sm" href="/super-admin" layout="horizontal" />
            </div>
            <div className="flex items-center gap-1.5 mt-2 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider">
              <ShieldAlert className="size-3" />
              Super Admin
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="pt-2">
        <NavMain items={superAdminNav} />
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200 dark:border-slate-800 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => router.push("/dashboard")}>
              <ArrowLeftIcon className="size-4 mr-2" />
              <span className="font-medium">Return to App</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
