"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
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
  BrainCircuit,
  UserCog,
  FileKey,
  PackageSearch,
  LineChart,
  CircleDollarSign,
  Layers,
  ClipboardList,
  CheckSquare,
  Plug,
  HeadphonesIcon,
  BellRing,
  BarChart3,
  Database,
} from "lucide-react"
import { Logo } from "@/components/logo"
import { useRouter } from "next/navigation"

export function SuperAdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  
  const navCategories = [
    {
      title: "Platform",
      items: [
        { title: "Overview", url: "/super-admin", icon: <LayoutDashboardIcon className="size-4" /> },
        { title: "System Health", url: "/super-admin/health", icon: <ActivityIcon className="size-4" /> },
        { title: "AI Telemetry", url: "/super-admin/ai", icon: <BrainCircuit className="size-4" /> },
      ]
    },
    {
      title: "Tenants & Billing",
      items: [
        { title: "Tenants & Orgs", url: "/super-admin/tenants", icon: <UsersIcon className="size-4" /> },
        { title: "Global Billing", url: "/super-admin/billing", icon: <CreditCardIcon className="size-4" /> },
        { title: "Subscription Plans", url: "/super-admin/plans", icon: <PackageSearch className="size-4" /> },
      ]
    },
    {
      title: "App Settings",
      items: [
        { title: "Forecasting Admin", url: "/super-admin/forecasting-admin", icon: <LineChart className="size-4" /> },
        { title: "Dynamic Pricing", url: "/super-admin/dynamic-pricing", icon: <CircleDollarSign className="size-4" /> },
        { title: "Inventory Rules", url: "/super-admin/inventory-rules", icon: <Layers className="size-4" /> },
        { title: "Purchase Orders", url: "/super-admin/purchase-orders", icon: <ClipboardList className="size-4" /> },
        { title: "Approval Center", url: "/super-admin/approvals", icon: <CheckSquare className="size-4" /> },
      ]
    },
    {
      title: "Support & Security",
      items: [
        { title: "Integrations", url: "/super-admin/integrations", icon: <Plug className="size-4" /> },
        { title: "Support Tickets", url: "/super-admin/support", icon: <HeadphonesIcon className="size-4" /> },
        { title: "Notifications", url: "/super-admin/notifications", icon: <BellRing className="size-4" /> },
        { title: "Platform Reports", url: "/super-admin/reports", icon: <BarChart3 className="size-4" /> },
        { title: "Security Center", url: "/super-admin/security", icon: <ShieldAlert className="size-4" /> },
        { title: "Audit Logs", url: "/super-admin/audit", icon: <FileKey className="size-4" /> },
        { title: "Database Backup", url: "/super-admin/backup", icon: <Database className="size-4" /> },
      ]
    }
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
        {navCategories.map((category) => (
          <NavMain key={category.title} items={category.items} title={category.title} />
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t-0 pt-2">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
