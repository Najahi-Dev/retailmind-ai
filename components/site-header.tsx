// components/site-header.tsx
"use client"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { useRole } from "@/hooks/useRole"
import { Badge } from "@/components/ui/badge"
import { usePathname } from "next/navigation"
import { ShieldCheckIcon, UserCheckIcon, CrownIcon } from "lucide-react"

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":                "Dashboard",
  "/inventory":                "Inventory",
  "/forecasting":              "AI Forecasting",
  "/reorders":                 "Reorder Suggestions",
  "/reorders/purchase-orders": "Purchase Orders",
  "/suppliers":                "Suppliers",
  "/alerts":                   "Alerts",
  "/reports":                  "Reports",
  "/users":                    "User Management",
  "/settings":                 "Settings",
  "/settings/profile":         "My Profile",
  "/data":                     "Data Library",
  "/forecasting/pricing":      "AI Dynamic Pricing",
}

const ROLE_CONFIG: Record<string, { label: string; icon: any; className: string }> = {
  admin: {
    label: "Administrator",
    icon: CrownIcon,
    className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
  manager: {
    label: "Store Manager",
    icon: ShieldCheckIcon,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  staff: {
    label: "Inventory Staff",
    icon: UserCheckIcon,
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  cashier: {
    label: "Cashier",
    icon: UserCheckIcon,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
}

export function SiteHeader() {
  const { role } = useRole()
  const pathname  = usePathname()
  const title     = PAGE_TITLES[pathname] ?? "RetailMind AI"

  const roleInfo = role ? (ROLE_CONFIG[role.toLowerCase()] ?? {
    label: role.toUpperCase(),
    icon: ShieldCheckIcon,
    className: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
  }) : null;

  const RoleIcon = roleInfo?.icon;

  return (
    <header className="
      sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b border-slate-200/80 dark:border-slate-800/80
      bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl text-slate-900 dark:text-slate-100
      px-4 lg:px-5
      transition-all ease-linear
      group-has-data-[collapsible=icon]/sidebar-wrapper:h-16
    ">
      <div className="flex w-full items-center gap-3">

        {/* Sidebar toggle */}
        <SidebarTrigger className="-ml-1 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white" />

        <Separator
          orientation="vertical"
          className="mx-1 data-[orientation=vertical]:h-8 bg-slate-200 dark:bg-slate-800"
        />

        {/* Page title */}
        <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h1>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          {roleInfo && (
            <Badge
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-xl border shadow-2xs ${roleInfo.className}`}
            >
              {RoleIcon && <RoleIcon className="w-3.5 h-3.5" />}
              <span>{roleInfo.label}</span>
            </Badge>
          )}
          <ModeToggle />
        </div>

      </div>
    </header>
  )
}