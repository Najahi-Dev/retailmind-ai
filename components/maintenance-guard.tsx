"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AlertCircle, Hammer, Clock } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

interface MaintenanceGuardProps {
  children: ReactNode;
  userRole?: string;
}

export function MaintenanceGuard({ children, userRole }: MaintenanceGuardProps) {
  const status = useQuery(api.system.getStatus);
  const [activeFor, setActiveFor] = useState<string>("");

  useEffect(() => {
    if (!status?.maintenanceMode || !status.updatedAt) return;

    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - status.updatedAt!) / 1000);
      const hours = Math.floor(diff / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      const secs = diff % 60;
      
      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (mins > 0 || hours > 0) parts.push(`${mins}m`);
      parts.push(`${secs}s`);
      
      setActiveFor(parts.join(" "));
    }, 1000);

    return () => clearInterval(interval);
  }, [status?.maintenanceMode, status?.updatedAt]);

  // If loading, just show children or a loader
  if (status === undefined) {
    return <>{children}</>;
  }

  // If maintenance mode is active, block non-super_admin users
  if (status.maintenanceMode && userRole !== "super_admin") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400"></div>
          
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Hammer className="w-8 h-8 text-amber-600 dark:text-amber-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            System Maintenance
          </h1>
          
          <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
            RetailMind is currently undergoing scheduled maintenance to improve our systems. We apologize for any inconvenience. Please check back shortly.
          </p>
          
          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 flex flex-col gap-3 border border-amber-200/50 dark:border-amber-800/50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <div className="text-left">
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Status Active</h3>
                <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-1">Our engineering team is actively working on the platform.</p>
              </div>
            </div>
            
            {activeFor && (
              <div className="flex items-center gap-2 pt-3 mt-1 border-t border-amber-200/50 dark:border-amber-800/50 text-amber-700 dark:text-amber-400/90 text-xs font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Maintenance started {activeFor} ago</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
