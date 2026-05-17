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
} from "lucide-react"
import { useRole } from "@/hooks/useRole"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import Link from "next/link"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const {
    isAdmin,
    isManager,
    isStaff,
    isSupplier,
    isLoading,
  } = useRole()

  // Alert count for badge
  const alertStats = useQuery(api.alerts.getUnreadCount)
  const alertBadge = alertStats?.unread ?? 0

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
      url:   "/dashboard",
      icon:  <LayoutDashboardIcon className="size-4" />,
    },
    {
      title: "AI Forecasting",
      url:   "/forecasting",
      icon:  <SparklesIcon className="size-4" />,
    },
    {
      title: "Inventory",
      url:   "/inventory",
      icon:  <PackageIcon className="size-4" />,
    },
    {
      title: "Reorder Suggestions",
      url:   "/reorders",
      icon:  <RotateCcwIcon className="size-4" />,
    },
    {
      title: "Purchase Orders",
      url:   "/reorders/purchase-orders",
      icon:  <ShoppingCartIcon className="size-4" />,
    },
    {
      title: "Suppliers",
      url:   "/suppliers",
      icon:  <TruckIcon className="size-4" />,
    },
    {
      title: "Alerts",
      url:   "/alerts",
      icon:  <BellIcon className="size-4" />,
      badge: alertBadge,
    },
  ]

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
      url:   "/dashboard",
      icon:  <LayoutDashboardIcon className="size-4" />,
    },
    {
      title: "AI Forecasting",
      url:   "/forecasting",
      icon:  <SparklesIcon className="size-4" />,
    },
    {
      title: "Inventory",
      url:   "/inventory",
      icon:  <PackageIcon className="size-4" />,
    },
    {
      title: "Reorder Suggestions",
      url:   "/reorders",
      icon:  <RotateCcwIcon className="size-4" />,
    },
    {
      title: "Purchase Orders",
      url:   "/reorders/purchase-orders",
      icon:  <ShoppingCartIcon className="size-4" />,
    },
    {
      title: "Suppliers",
      url:   "/suppliers",
      icon:  <TruckIcon className="size-4" />,
    },
    {
      title: "Alerts",
      url:   "/alerts",
      icon:  <BellIcon className="size-4" />,
      badge: alertBadge,
    },
    {
      title: "User Management",
      url:   "/users",
      icon:  <UsersIcon className="size-4" />,
    },
  ]

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
    <Sidebar collapsible="offcanvas" {...props}>

      {/* ── Logo ──────────────────────────────── */}
      <SidebarHeader className="border-b pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-12 hover:bg-transparent active:bg-transparent"
            >
              <Link href="/dashboard" className="flex items-center gap-3 px-1">

                {/* Logo icon */}
                <div className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm font-[Montserrat] shadow-sm">
                  R
                  {/* Pulse dot — shows when alerts exist */}
                  {alertBadge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-destructive ring-2 ring-sidebar" />
                  )}
                </div>

                {/* Brand name */}
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold tracking-tight text-foreground font-[Montserrat]">
                    RetailMind AI
                  </span>
                  <span className="text-[10px] text-muted-foreground tracking-wide">
                    Smart Inventory
                  </span>
                </div>

              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Nav content ───────────────────────── */}
      <SidebarContent className="pt-2">

        <NavMain items={navMain} />

        {(isAdmin || isManager) && navDocuments.length > 0 && (
          <>
            <SidebarSeparator className="mx-3 my-1" />
            <NavDocuments items={navDocuments} />
          </>
        )}

      </SidebarContent>

      {/* ── Footer ────────────────────────────── */}
      <SidebarFooter className="border-t pt-2">
        <NavSecondary items={navSecondary} />
        <SidebarSeparator className="mx-3 my-1" />
        <NavUser />
      </SidebarFooter>

    </Sidebar>
  )
}