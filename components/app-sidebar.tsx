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
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  ListIcon,
  ChartBarIcon,
  PackageIcon,
  UsersIcon,
  FileTextIcon,
  Settings2Icon,
  CircleHelpIcon,
  SearchIcon,
  DatabaseIcon,
  FileChartColumnIcon,
  FileIcon,
  Store,
  BellIcon,
  TruckIcon,
  RotateCcwIcon,
  ShoppingCartIcon,
  SparklesIcon,
} from "lucide-react"
import { useRole } from "@/hooks/useRole"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const {
    isAdmin,
    isManager,
    isStaff,
    isSupplier,
    isLoading,
  } = useRole()

  // ── Supplier nav ─────────────────────────────────
  const supplierMain = [
    {
      title: "Purchase Orders",
      url:   "/reorders/purchase-orders",
      icon:  <ShoppingCartIcon />,
    },
  ]

  const supplierSecondary = [
    {
      title: "Settings",
      url:   "/settings",
      icon:  <Settings2Icon />,
    },
    {
      title: "Get Help",
      url:   "/help",
      icon:  <CircleHelpIcon />,
    },
  ]

  // ── Staff nav ─────────────────────────────────────
  const staffMain = [
    {
      title: "Inventory",
      url:   "/inventory",
      icon:  <PackageIcon />,
    },
    {
      title: "Alerts",
      url:   "/alerts",
      icon:  <BellIcon />,
    },
  ]

  const staffSecondary = [
    {
      title: "Settings",
      url:   "/settings",
      icon:  <Settings2Icon />,
    },
    {
      title: "Get Help",
      url:   "/help",
      icon:  <CircleHelpIcon />,
    },
    {
      title: "Search",
      url:   "/search",
      icon:  <SearchIcon />,
    },
  ]

  // ── Manager nav ───────────────────────────────────
  const managerMain = [
    {
      title: "Dashboard",
      url:   "/dashboard",
      icon:  <LayoutDashboardIcon />,
    },
    {
      title: "AI Forecasting",
      url:   "/forecasting",
      icon:  <SparklesIcon />,
    },
    {
      title: "Inventory",
      url:   "/inventory",
      icon:  <PackageIcon />,
    },
    {
      title: "Reorder Suggestions",
      url:   "/reorders",
      icon:  <RotateCcwIcon />,
    },
    {
      title: "Purchase Orders",
      url:   "/reorders/purchase-orders",
      icon:  <ShoppingCartIcon />,
    },
    {
      title: "Suppliers",
      url:   "/suppliers",
      icon:  <TruckIcon />,
    },
    {
      title: "Alerts",
      url:   "/alerts",
      icon:  <BellIcon />,
    },
  ]

  const managerDocuments = [
    {
      name: "Reports",
      url:  "/reports",
      icon: <FileChartColumnIcon />,
    },
    {
      name: "Data Library",
      url:  "/data",
      icon: <DatabaseIcon />,
    },
  ]

  const managerSecondary = [
    {
      title: "Settings",
      url:   "/settings",
      icon:  <Settings2Icon />,
    },
    {
      title: "Get Help",
      url:   "/help",
      icon:  <CircleHelpIcon />,
    },
    {
      title: "Search",
      url:   "/search",
      icon:  <SearchIcon />,
    },
  ]

  // ── Admin nav (full access) ───────────────────────
  const adminMain = [
    {
      title: "Dashboard",
      url:   "/dashboard",
      icon:  <LayoutDashboardIcon />,
    },
    {
      title: "AI Forecasting",
      url:   "/forecasting",
      icon:  <SparklesIcon />,
    },
    {
      title: "Inventory",
      url:   "/inventory",
      icon:  <PackageIcon />,
    },
    {
      title: "Reorder Suggestions",
      url:   "/reorders",
      icon:  <RotateCcwIcon />,
    },
    {
      title: "Purchase Orders",
      url:   "/reorders/purchase-orders",
      icon:  <ShoppingCartIcon />,
    },
    {
      title: "Suppliers",
      url:   "/suppliers",
      icon:  <TruckIcon />,
    },
    {
      title: "Alerts",
      url:   "/alerts",
      icon:  <BellIcon />,
    },
    {
      title: "User Management",
      url:   "/users",
      icon:  <UsersIcon />,
    },
  ]

  const adminDocuments = [
    {
      name: "Reports",
      url:  "/reports",
      icon: <FileChartColumnIcon />,
    },
    {
      name: "Data Library",
      url:  "/data",
      icon: <DatabaseIcon />,
    },
    {
      name: "Documents",
      url:  "/documents",
      icon: <FileIcon />,
    },
  ]

  const adminSecondary = [
    {
      title: "Settings",
      url:   "/settings",
      icon:  <Settings2Icon />,
    },
    {
      title: "Get Help",
      url:   "/help",
      icon:  <CircleHelpIcon />,
    },
    {
      title: "Search",
      url:   "/search",
      icon:  <SearchIcon />,
    },
  ]

  // ── Pick correct nav based on role ───────────────
  const navMain      = isAdmin
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
    : staffMain === navMain
    ? staffSecondary
    : supplierSecondary

  // ── Loading skeleton ──────────────────────────────
  if (isLoading) {
    return (
      <Sidebar collapsible="offcanvas" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="data-[slot=sidebar-menu-button]:p-1.5!">
                <Store className="size-5!" />
                <span className="text-base font-semibold">RetailMind AI</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <div className="px-4 py-2 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-8 rounded-md bg-muted animate-pulse"
              />
            ))}
          </div>
        </SidebarContent>
      </Sidebar>
    )
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>

      {/* Header — Logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="/dashboard">
                <Store className="size-5!" />
                <span className="text-base font-semibold">RetailMind AI</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Main content */}
      <SidebarContent>

        {/* Main nav items */}
        <NavMain items={navMain} />

        {/* Documents — admin + manager only */}
        {(isAdmin || isManager) && navDocuments.length > 0 && (
          <NavDocuments items={navDocuments} />
        )}

      </SidebarContent>

      {/* Footer — user info */}
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

    </Sidebar>
  )
}