import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ROLE_HOME: Record<string, string> = {
  admin: "/dashboard",
  manager: "/dashboard",
  staff: "/inventory",
  supplier: "/reorders/purchase-orders",
};

export default async function AccessDeniedPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const role = (user.publicMetadata?.role as string) ?? "staff";
  const homeUrl = ROLE_HOME[role] ?? "/inventory";

  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[80vh] p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 sm:p-12 rounded-3xl shadow-xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Shield Icon */}
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 dark:text-red-400 mx-auto animate-pulse">
          <ShieldAlert className="w-10 h-10" />
        </div>

        {/* 403 Code */}
        <div className="space-y-1">
          <span className="font-heading text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            403
          </span>
          <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
            Access Restricted
          </h1>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Your current account role does not have permission to access this module. Contact your supermarket administrator if access is required.
        </p>

        {/* Current Role Badge */}
        <div className="pt-1">
          <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 px-4 py-1 text-xs">
            Current Role: <span className="font-bold capitalize ml-1">{role}</span>
          </Badge>
        </div>

        {/* Primary CTA */}
        <div className="pt-4">
          <Button asChild size="lg" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 rounded-xl">
            <Link href={homeUrl} className="flex items-center justify-center gap-2">
              <Home className="w-4 h-4" /> Go to My Module ({role === "staff" ? "Inventory" : "Dashboard"})
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}