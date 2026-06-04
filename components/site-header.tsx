// components/site-header.tsx
"use client"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { useRole } from "@/hooks/useRole"
import { Badge } from "@/components/ui/badge"
import { usePathname } from "next/navigation"

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
  "/forecasting/pricing": "AI Dynamic Pricing",
}

export function SiteHeader() {
  const { role } = useRole()
  const pathname  = usePathname()
  const title     = PAGE_TITLES[pathname] ?? "RetailMind AI"

  return (
    <header className="
      flex h-16 shrink-0 items-center gap-2 border-b
      px-6 lg:px-8
      transition-[width,height] ease-linear
      group-has-data-[collapsible=icon]/sidebar-wrapper:h-16
    ">
      <div className="flex w-full items-center gap-3">

        {/* Sidebar toggle */}
        <SidebarTrigger className="-ml-1" />

        <Separator
          orientation="vertical"
          className="mx-1 data-[orientation=vertical]:h-8"
        />

        {/* Page title */}
        <h1 className="text-base font-semibold tracking-tight">
          {title}
        </h1>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-4">
          {role && (
            <Badge
              variant="outline"
              className="uppercase text-[10px] tracking-wider px-3 pt-2.5 pb-2 hidden sm:flex"
            >
              {role}
            </Badge>
          )}
          <ModeToggle />
        </div>

      </div>
    </header>
  )
}