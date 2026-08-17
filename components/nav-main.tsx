"use client"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Badge }       from "@/components/ui/badge"
import { usePathname } from "next/navigation"
import Link            from "next/link"
import { cn }          from "@/lib/utils"

export function NavMain({
  items,
}: {
  items: {
    title:  string
    url:    string
    icon?:  React.ReactNode
    badge?: number
  }[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1">
        <SidebarMenu>
          {items.map((item) => {

            const isActive = (() => {
              // ── Exact match only routes ──────────────
              const exactOnly = [
                "/inventory/stock-out",
                "/inventory/stock-in",
                "/inventory/adjustment",
                "/forecasting/pricing",  
                "/forecasting",
                "/super-admin",
              ];
              if (exactOnly.includes(item.url)) {
                return pathname === item.url;
              }

              // ── Reorders purchase-orders ─────────────
              if (item.url === "/reorders/purchase-orders") {
                return (
                  pathname === "/reorders/purchase-orders" ||
                  pathname.startsWith("/reorders/purchase-orders/")
                );
              }

              // ── Reorders (exclude purchase-orders) ───
              if (item.url === "/reorders") {
                return (
                  pathname === "/reorders" ||
                  (pathname.startsWith("/reorders/") &&
                    !pathname.startsWith("/reorders/purchase-orders"))
                );
              }

              // ── Inventory (exclude sub-pages) ────────
              if (item.url === "/inventory") {
                return (
                  pathname === "/inventory" ||
                  (pathname.startsWith("/inventory/") &&
                    !pathname.startsWith("/inventory/stock-out") &&
                    !pathname.startsWith("/inventory/stock-in") &&
                    !pathname.startsWith("/inventory/adjustment"))
                );
              }

              // ── Default ──────────────────────────────
              return (
                pathname === item.url ||
                pathname.startsWith(item.url + "/")
              );
            })();

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-2.5 h-11 text-[15px] transition-all duration-200 border",
                    isActive
                      ? "bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-500/30 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs"
                      : "border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 font-medium",
                  )}
                >
                  <Link
                    href={item.url}
                    className="flex items-center gap-3 w-full"
                  >
                    <div className={cn(
                      "size-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 [&_svg]:size-4.5",
                      isActive
                        ? "bg-indigo-600/15 dark:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400"
                        : "bg-transparent text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white",
                    )}>
                      {item.icon}
                    </div>

                    <span className={cn(
                      "flex-1 truncate tracking-tight transition-colors",
                      isActive
                        ? "text-indigo-600 dark:text-indigo-400 font-bold"
                        : "text-slate-700 dark:text-slate-300 font-medium group-hover:text-slate-900 dark:group-hover:text-white"
                    )}>
                      {item.title}
                    </span>

                    {item.badge && item.badge > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-auto h-5 min-w-5 px-1.5 text-[11px] font-bold rounded-full flex items-center justify-center shadow-xs"
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}