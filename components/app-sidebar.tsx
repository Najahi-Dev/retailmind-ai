// components/app-sidebar.tsx
"use client"

import * as React from "react"
import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  PackageIcon,
  UsersIcon,
  Settings2Icon,
  CircleHelpIcon,
  SearchIcon,
  DatabaseIcon,
  FileChartColumnIcon,
  FileIcon,
  BellIcon,
  TruckIcon,
  RotateCcwIcon,
  ShoppingCartIcon,
  SparklesIcon,
  TrendingDown,
  TrendingDownIcon,
  TrendingUpIcon,
  ChartCandlestick,
  CreditCardIcon,
} from "lucide-react"
import { useRole } from "@/hooks/useRole"
import { useAuth } from "@/lib/auth-context"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { token } = useAuth()
  const {
    isAdmin,
    isManager,
    isStaff,
    isSupplier,
    isLoading,
  } = useRole()

  // Alert count for badge
  const alertStats = useQuery(api.alerts.getAlertStats, { token: token ?? undefined });
  const unreadCount = alertStats?.unread ?? 0;
  const alertBadge = unreadCount === 0 ? undefined : unreadCount > 99 ? "99+" : String(unreadCount);

  // ── Supplier nav ──────────────────────────────
  const supplierMain = [
    {
      title: "Purchase Orders",
      url:   "/reorders/purchase-orders",
      icon:  <ShoppingCartIcon className="size-4" />,
    },
  ]

  const supplierSecondary = [
    { title: "Settings", url: "/settings", icon: <Settings2Icon className="size-4" /> },
    { title: "Get Help", url: "/help",     icon: <CircleHelpIcon className="size-4" /> },
  ]

  // ── Staff nav ─────────────────────────────────
  const staffMain = [
    {
      title: "Inventory",
      url:   "/inventory",
      icon:  <PackageIcon className="size-4" />,
    },
    {
      title: "Stock-In",
      url:   "/inventory/stock-in",
      icon:  <TrendingUpIcon className="size-4" />,
    },
    {
      title: "Stock-Out",
      url:   "/inventory/stock-out",
      icon:  <TrendingDownIcon className="size-4" />,
    },
    {
      title: "Alerts",
      url:   "/alerts",
      icon:  <BellIcon className="size-4" />,
      badge: alertBadge,
    },
  ]

  const staffSecondary = [
    { title: "Settings", url: "/settings", icon: <Settings2Icon className="size-4" /> },
    { title: "Get Help", url: "/help",     icon: <CircleHelpIcon className="size-4" /> },
    { title: "Search",   url: "/search",   icon: <SearchIcon     className="size-4" /> },
  ]

  // ── Manager nav ───────────────────────────────
  const managerMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon className="size-4" />,
    },
    {
      title: "AI Forecasting",
      url: "/forecasting",
      icon: <SparklesIcon className="size-4" />,
    },
    {
      title: "Dynamic Pricing",
      url: "/forecasting/pricing",
      icon: <ChartCandlestick className="size-4" />,
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: <PackageIcon className="size-4" />,
    },
    {
      title: "Reorder Suggestions",
      url: "/reorders",
      icon: <RotateCcwIcon className="size-4" />,
    },
    {
      title: "Purchase Orders",
      url: "/reorders/purchase-orders",
      icon: <ShoppingCartIcon className="size-4" />,
    },
    {
      title: "Suppliers",
      url: "/suppliers",
      icon: <TruckIcon className="size-4" />,
    },
    {
      title: "Alerts",
      url: "/alerts",
      icon: <BellIcon className="size-4" />,
      badge: alertBadge,
    },
  ];

  const managerDocuments = [
    { name: "Reports",      url: "/reports", icon: <FileChartColumnIcon className="size-4" /> },
    { name: "Data Library", url: "/data",    icon: <DatabaseIcon        className="size-4" /> },
  ]

  const managerSecondary = [
    { title: "Settings", url: "/settings", icon: <Settings2Icon className="size-4" /> },
    { title: "Get Help", url: "/help",     icon: <CircleHelpIcon className="size-4" /> },
    { title: "Search",   url: "/search",   icon: <SearchIcon     className="size-4" /> },
  ]

  // ── Admin nav ─────────────────────────────────
  const adminMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon className="size-4" />,
    },
    {
      title: "AI Forecasting",
      url: "/forecasting",
      icon: <SparklesIcon className="size-4" />,
    },
    {
      title: "Dynamic Pricing",
      url: "/forecasting/pricing",
      icon: <ChartCandlestick className="size-4" />,
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: <PackageIcon className="size-4" />,
    },
    {
      title: "Reorder Suggestions",
      url: "/reorders",
      icon: <RotateCcwIcon className="size-4" />,
    },
    {
      title: "Purchase Orders",
      url: "/reorders/purchase-orders",
      icon: <ShoppingCartIcon className="size-4" />,
    },
    {
      title: "Suppliers",
      url: "/suppliers",
      icon: <TruckIcon className="size-4" />,
    },
    {
      title: "Alerts",
      url: "/alerts",
      icon: <BellIcon className="size-4" />,
      badge: alertBadge,
    },
    {
      title: "User Management",
      url: "/users",
      icon: <UsersIcon className="size-4" />,
    },
  ];

  const adminDocuments = [
    { name: "Reports",      url: "/reports",   icon: <FileChartColumnIcon className="size-4" /> },
    { name: "Data Library", url: "/data",      icon: <DatabaseIcon        className="size-4" /> },
    { name: "Documents",    url: "/documents", icon: <FileIcon            className="size-4" /> },
  ]

  const adminSecondary = [
    { title: "Settings", url: "/settings", icon: <Settings2Icon className="size-4" /> },
    { title: "Get Help", url: "/help",     icon: <CircleHelpIcon className="size-4" /> },
    { title: "Search",   url: "/search",   icon: <SearchIcon     className="size-4" /> },
  ]

  // ── Pick nav based on role ────────────────────
  const navMain = isAdmin
    ? adminMain
    : isManager
    ? managerMain
    : isStaff
    ? staffMain
    : supplierMain

  const navDocuments = isAdmin
    ? adminDocuments
    : isManager
    ? managerDocuments
    : []

  const navSecondary = isAdmin
    ? adminSecondary
    : isManager
    ? managerSecondary
    : isStaff
    ? staffSecondary
    : supplierSecondary

  // ── Loading skeleton ──────────────────────────
  if (isLoading) {
    return (
      <Sidebar collapsible="offcanvas" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="h-12">
                <div className="flex items-center gap-3">
                  <div className="size-7 rounded-lg bg-muted animate-pulse" />
                  <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <div className="px-3 py-2 space-y-1">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-9 rounded-md bg-muted animate-pulse"
                style={{ opacity: 1 - i * 0.12 }}
              />
            ))}
          </div>
        </SidebarContent>
      </Sidebar>
    )
  }

  return (
    <Sidebar collapsible="offcanvas" className="border-none shadow-[4px_0_24px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.35)]" {...props}>

      {/* ── Logo & Workspace Switcher ─────────── */}
      <SidebarHeader className="flex flex-col border-b border-slate-200 dark:border-slate-800 p-3 gap-2">
        <SidebarMenu className="w-full">
          <SidebarMenuItem className="flex justify-center">
            <div className="relative flex items-center justify-center w-full py-0.5">
              <Logo size="sm" href="/dashboard" layout="horizontal" />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        <WorkspaceSwitcher />
      </SidebarHeader>

      {/* ── Nav content ───────────────────────── */}
      <SidebarContent className="pt-2">

        <NavMain items={navMain} />

        {(isAdmin || isManager) && navDocuments.length > 0 && (
          <>
            <SidebarSeparator className="mx-3 my-1 opacity-50" />
            <NavDocuments items={navDocuments} />
          </>
        )}

      </SidebarContent>

      {/* ── Footer ────────────────────────────── */}
      <SidebarFooter className="border-t-0 pt-2">
        <NavSecondary items={navSecondary} />
        <SidebarSeparator className="mx-3 my-1 opacity-50" />
        <NavUser />
      </SidebarFooter>

    </Sidebar>
  )
}