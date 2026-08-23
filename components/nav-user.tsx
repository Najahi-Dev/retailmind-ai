"use client"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth, useRole } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { ChevronsUpDownIcon, UserIcon, LogOutIcon, ShieldCheckIcon, ZapIcon, RocketIcon, CrownIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"

const PLAN_BADGES: Record<string, { label: string; Icon: any; bg: string }> = {
  starter: { label: "Starter", Icon: ZapIcon, bg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  growth: { label: "Growth", Icon: RocketIcon, bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  enterprise: { label: "Enterprise", Icon: CrownIcon, bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
};

export function NavUser() {
  const { isMobile } = useSidebar()
  const { user, logout } = useAuth()
  const { isSuperAdmin } = useRole()
  const router = useRouter()
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)

  if (!user) return null

  const rawPlan = ((user as any).planTier || (user as any).plan || "starter").toLowerCase();
  const planInfo = PLAN_BADGES[rawPlan] ?? PLAN_BADGES.starter;
  const PlanIcon = planInfo.Icon;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "RM"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800">
                <AvatarImage src={user.imageUrl} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="grid flex-1 text-left text-sm leading-tight">
                <div className="flex items-center justify-start gap-1.5 min-w-0">
                  <span className="truncate font-semibold text-slate-900 dark:text-white">{user.name}</span>
                  <Badge
                    title={`${planInfo.label} Plan`}
                    className={`size-5 p-0 rounded-full border ${planInfo.bg} shrink-0 inline-flex items-center justify-center`}
                  >
                    <PlanIcon className="w-3 h-3 shrink-0" />
                  </Badge>
                </div>
                <span className="truncate text-xs text-slate-500 dark:text-slate-400 capitalize flex items-center gap-1">
                  {isSuperAdmin ? (
                    <ShieldCheckIcon className="w-3 h-3 text-violet-500 shrink-0" />
                  ) : user.role === "admin" ? (
                    <CrownIcon className="w-3 h-3 text-indigo-500 shrink-0" />
                  ) : user.role === "manager" ? (
                    <ShieldCheckIcon className="w-3 h-3 text-emerald-500 shrink-0" />
                  ) : (
                    <UserIcon className="w-3 h-3 text-blue-500 shrink-0" />
                  )}
                  {isSuperAdmin ? "Super Admin" : user.role}
                </span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4 text-slate-400 shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg p-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2.5 px-2 py-1.5 text-left text-sm">
                <Avatar className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800">
                  <AvatarImage src={user.imageUrl} alt={user.name} />
                  <AvatarFallback className="rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-xs leading-tight">
                  <div className="flex items-center justify-start gap-1.5 min-w-0">
                    <span className="truncate font-bold text-slate-900 dark:text-white">{user.name}</span>
                    <Badge
                      title={`${planInfo.label} Plan`}
                      className={`size-5 p-0 rounded-full border ${planInfo.bg} shrink-0 inline-flex items-center justify-center`}
                    >
                      <PlanIcon className="w-3 h-3 shrink-0" />
                    </Badge>
                  </div>
                  <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />

            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => router.push(`/users/${user.id}`)}
                className="rounded-xl text-xs font-semibold cursor-pointer py-2 focus:bg-indigo-500/10 focus:text-indigo-600 dark:focus:text-indigo-400"
              >
                <UserIcon className="mr-2 h-4 w-4 text-indigo-500" />
                My Profile
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />

            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setShowSignOutDialog(true);
              }}
              className="rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 cursor-pointer py-2 focus:bg-red-500/10 focus:text-red-600 dark:focus:text-red-400"
            >
              <LogOutIcon className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent className="rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">Sign Out</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              Are you sure you want to sign out of your account? You will need to log in again to access the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await logout();
              }}
              className="rounded-lg bg-red-600 hover:bg-red-500 text-white border-0"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarMenu>
  )
}
