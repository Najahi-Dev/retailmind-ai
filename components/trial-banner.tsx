"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TrialBanner() {
  const router = useRouter();
  const { token } = useAuth();
  const trialStatus = useQuery(api.organizations.getTrialStatus, { token: token ?? undefined });

  // Redirect logic: if not subscribed, redirect based on trial status
  useEffect(() => {
    if (trialStatus && !trialStatus.isSubscribed) {
      if (!trialStatus.isTrialUsed) {
        // Trial not started yet, redirect to plan selection to start trial or subscribe
        router.replace("/select-plan");
      } else if (trialStatus.isTrialExpired) {
        // Trial used and expired, redirect to billing page
        router.replace("/settings/billing");
      }
    }
  }, [trialStatus, router]);

  // If no trial status or user is subscribed, no banner to show
  if (!trialStatus || trialStatus.isSubscribed) {
    return null;
  }

  // At this point, we know trialStatus exists and is not subscribed.
  // We only show the banner if the trial is currently active (used and not expired).
  // For other cases (not used or expired), we rely on the useEffect to redirect.
  const isTrialUsed = trialStatus.isTrialUsed ?? false;
  const isTrialExpired = trialStatus.isTrialExpired ?? false;

  if (!isTrialUsed || isTrialExpired) {
    // We are going to redirect in useEffect, so we render nothing to avoid flashing the banner.
    return null;
  }

  // Show the countdown banner for an active trial
  return (
    <div className="w-full px-4 pt-2.5 pb-1">
      <div className="w-full bg-[#FFF0E6] dark:bg-[#2D1A12] border border-[#FFD6C0] dark:border-[#5B301E] rounded-xl px-4 py-2.5 flex items-center justify-between shadow-xs transition-all">
        <div className="flex items-center gap-2 text-[#7A3E26] dark:text:#FFC4AC] flex-1">
          <ClockIcon className="size-4 text:#C85A32] dark:text:#FFA07A] shrink-0" />
          <span className="font-extrabold text-[#592612] dark:text:#FFE3D6]">
            <strong>{trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? "day" : "days"}</strong>{" "}
            left in your free trial.
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* We removed the timer for simplicity, but we can keep the countdown above */}
          <Link href="/select-plan">
            <Button
              size="sm"
              className="h-8 bg-[#007AFF] hover:bg:#0062CC] text-white font-bold text-xs rounded-lg px-4 shadow-sm transition-all border-none"
            >
              Subscribe now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}