// components/nav-secondary.tsx
"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SlidersHorizontalIcon, ChevronUpIcon, SparklesIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: React.ReactNode;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const pathname = usePathname();
  const activeItem = items.find((item) => pathname === item.url);
  const isAnyActive = !!activeItem;

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className={cn(
                    "relative flex items-center justify-between gap-3 rounded-xl px-2.5 h-11 text-[14px] transition-all duration-200 border cursor-pointer w-full",
                    isAnyActive
                      ? "bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-500/30 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs"
                      : "border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 font-semibold"
                  )}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div
                      className={cn(
                        "size-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 [&_svg]:size-4.5",
                        isAnyActive
                          ? "bg-indigo-600/15 dark:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      )}
                    >
                      {activeItem ? activeItem.icon : <SlidersHorizontalIcon className="size-4.5" />}
                    </div>
                    <span className="truncate tracking-tight">
                      {activeItem ? activeItem.title : "Settings & Utilities"}
                    </span>
                  </div>
                  <ChevronUpIcon className="size-4 text-slate-400 shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                sideOffset={8}
                className="w-56 rounded-xl p-1.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl space-y-0.5"
              >
                <DropdownMenuLabel className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 px-2 py-1 flex items-center gap-1.5">
                  <SparklesIcon className="size-3 text-indigo-500" /> System Menu
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />
                {items.map((item) => {
                  const isActive = pathname === item.url;
                  return (
                    <DropdownMenuItem
                      key={item.title}
                      asChild
                      className={cn(
                        "rounded-lg cursor-pointer py-2 px-2.5 transition-colors focus:bg-indigo-50 dark:focus:bg-indigo-950/50 focus:text-indigo-600 dark:focus:text-indigo-400",
                        isActive && "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold"
                      )}
                    >
                      <Link href={item.url} className="flex items-center gap-3 w-full">
                        <div
                          className={cn(
                            "size-7 rounded-md flex items-center justify-center shrink-0 [&_svg]:size-4",
                            isActive
                              ? "bg-indigo-600/15 dark:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          )}
                        >
                          {item.icon}
                        </div>
                        <span className="text-xs font-semibold">{item.title}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}