// components/site-header.tsx
"use client"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { useRole } from "@/hooks/useRole"
import { Badge } from "@/components/ui/badge"
import { usePathname } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ShieldCheckIcon, UserCheckIcon, CrownIcon, BellIcon, PackageIcon, ArrowRightIcon } from "lucide-react"

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
  supplier: {
    label: "Vendor Supplier",
    icon: PackageIcon,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
}

export function SiteHeader() {
  const { role } = useRole()
  const { token } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ?? "RetailMind AI"

  const supplierAlerts = useQuery(api.purchaseOrders.getSupplierPOAlerts, {
    token: token ?? undefined,
  })

  const activeAlertCount = supplierAlerts?.length ?? 0

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
          {/* Supplier PO Placement Alerts Dropdown */}
          {role === "supplier" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  title="Supplier Notifications"
                >
                  <BellIcon className={`w-4 h-4 ${activeAlertCount > 0 ? "text-amber-500 animate-bounce" : ""}`} />
                  {activeAlertCount > 0 && (
                    <span className="absolute -top-1 -right-1 size-4 rounded-full bg-amber-500 text-white font-extrabold text-[10px] flex items-center justify-center shadow-xs">
                      {activeAlertCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-80 rounded-2xl p-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl space-y-1"
              >
                <DropdownMenuLabel className="px-2 py-1.5 text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Supplier PO Alerts</span>
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
                    {activeAlertCount} Placed
                  </Badge>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="border-slate-100 dark:border-slate-800" />

                {activeAlertCount === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-medium">
                    No new purchase order alerts at this time.
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1 p-1">
                    {supplierAlerts?.map((po) => (
                      <DropdownMenuItem
                        key={po._id}
                        onClick={() => router.push("/reorders/purchase-orders")}
                        className="rounded-xl p-2.5 flex flex-col items-start gap-1 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 cursor-pointer transition-all"
                      >
                        <div className="w-full flex items-center justify-between">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {po.poNumber}
                          </span>
                          <span className="text-[10px] text-amber-600 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                            Newly Placed
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                          Placed by <strong className="text-slate-900 dark:text-white">{po.placedBy}</strong> ({po.itemCount} items)
                        </p>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}

                <DropdownMenuSeparator className="border-slate-100 dark:border-slate-800" />

                <DropdownMenuItem
                  onClick={() => router.push("/reorders/purchase-orders")}
                  className="rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 justify-center py-2 cursor-pointer focus:bg-indigo-500/10"
                >
                  Open PO Dashboard <ArrowRightIcon className="w-3.5 h-3.5 ml-1" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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