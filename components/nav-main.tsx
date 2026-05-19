// components/nav-main.tsx
"use client"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    badge?: number        // ← notification count
  }[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1">
        <SidebarMenu>
          {items.map((item) => {
            // components/nav-main.tsx — isActive logic fix pannu

const isActive =
  item.url === "/reorders/purchase-orders"
    ? pathname === "/reorders/purchase-orders" ||
      pathname.startsWith("/reorders/purchase-orders/")
    : item.url === "/reorders"
    ? pathname === "/reorders" ||
      (pathname.startsWith("/reorders/") &&
       !pathname.startsWith("/reorders/purchase-orders"))
    : pathname === item.url ||
      pathname.startsWith(item.url + "/");

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                  className={cn(
                    "relative flex items-center gap-2 rounded-sm px-3 py-5 text-sm transition-all duration-150",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Link
                    href={item.url}
                    className="flex items-center gap-2 w-full"
                  >
                    {/* Icon */}
                    <span className={cn(
                      "size-4 shrink-0 transition-colors",
                      isActive
                        ? "text-sidebar-accent-foreground"
                        : "text-muted-foreground"
                    )}>
                      {item.icon}
                    </span>

                    {/* Label */}
                    <span className="flex-1 truncate">
                      {item.title}
                    </span>

                    {/* Notification badge */}
                    {item.badge && item.badge > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-auto h-5 min-w-5 px-1.5 text-[10px] font-semibold rounded-full flex items-center justify-center"
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </Badge>
                    )}

                    {/* Active indicator bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-primary rounded-r-full" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}