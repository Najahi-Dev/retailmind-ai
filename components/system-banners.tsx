"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AlertTriangle, Info, XCircle } from "lucide-react";

export function SystemBanners() {
  const activeBanners = useQuery(api.superAdmin.getActiveBanners);

  if (!activeBanners || activeBanners.length === 0) return null;

  return (
    <div className="flex flex-col w-full z-50">
      {activeBanners.map((banner: any) => {
        let bgColor = "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400";
        let Icon = Info;
        
        if (banner.type === "warning") {
          bgColor = "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400";
          Icon = AlertTriangle;
        } else if (banner.type === "error") {
          bgColor = "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400";
          Icon = XCircle;
        }

        return (
          <div key={banner._id} className={`w-full p-2.5 px-4 flex items-center justify-center gap-2 border-b text-sm font-medium ${bgColor}`}>
            <Icon className="w-4 h-4 shrink-0" />
            <span>{banner.message}</span>
          </div>
        );
      })}
    </div>
  );
}
