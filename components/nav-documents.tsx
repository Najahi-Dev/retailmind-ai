// components/nav-documents.tsx
"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavDocuments({
  items,
}: {
  items: {
    name: string
    url:  string
    icon: React.ReactNode
  }[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3.5 pt-3 pb-1">
        Documents
      </SidebarGroupLabel>
      <SidebarMenu className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = pathname === item.url

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                asChild
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-2.5 h-11 text-[15px] transition-all duration-200 border",
                  isActive
                    ? "bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-500/30 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs"
                    : "border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 font-medium"
                )}
              >
                <Link href={item.url} className="flex items-center gap-3 w-full">
                  <div className={cn(
                    "size-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 [&_svg]:size-4.5",
                    isActive
                      ? "bg-indigo-600/15 dark:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400"
                      : "bg-transparent text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"
                  )}>
                    {item.icon}
                  </div>
                  <span className={cn(
                    "truncate tracking-tight transition-colors",
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400 font-bold"
                      : "text-slate-700 dark:text-slate-300 font-medium group-hover:text-slate-900 dark:group-hover:text-white"
                  )}>
                    {item.name}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}