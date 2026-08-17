"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { ClockIcon, TimerIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TrialBanner() {
  const router = useRouter();
  const { token } = useAuth();
  const trialStatus = useQuery(api.organizations.getTrialStatus, { token: token ?? undefined });
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!trialStatus || trialStatus.isSubscribed || trialStatus.isTrialExpired) return;

    // We rely on the trialEndsAt provided by the backend to calculate the live countdown
    const calculateTimeLeft = () => {
      const now = Date.now();
      const difference = trialStatus.trialEndsAt - now;

      if (difference <= 0) {
        setTimeLeft("00:00:00:00");
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft(
        `${days.toString().padStart(2, '0')}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
      );
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [trialStatus]);

  // Redirect logic: if not subscribed, redirect based on trial status
  useEffect(() => {
    if (trialStatus && !trialStatus.isSubscribed) {
      if (trialStatus.isTrialExpired) {
        // Trial used and expired, redirect to billing page
        router.replace("/settings/billing");
      }
    }
  }, [trialStatus, router]);

  // If no trial status or user is subscribed, no banner to show
  if (!trialStatus || trialStatus.isSubscribed || trialStatus.isTrialExpired) {
    return null;
  }

  // Show the countdown banner for an active trial
  return (
    <div className="w-full px-4 pt-2.5 pb-1">
      <div className="w-full bg-[#FFF0E6] dark:bg-[#2D1A12] border border-[#FFD6C0] dark:border-[#5B301E] rounded-xl px-4 py-2.5 flex items-center justify-between shadow-xs transition-all">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 text-[#7A3E26] dark:text-[#FFC4AC] flex-1">
          <div className="flex items-center gap-2">
            <ClockIcon className="size-4 text-[#C85A32] dark:text-[#FFA07A] shrink-0" />
            <span className="font-extrabold text-[#592612] dark:text-[#FFE3D6]">
              Free Trial Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 bg-[#FFE1CC] dark:bg-[#4A2616] px-2.5 py-1 rounded-md border border-[#FFC7A6] dark:border-[#6B361F] mr-1">
            <TimerIcon className="size-3.5 text-[#C85A32] dark:text-[#FFA07A]" />
            <span className="font-mono text-sm font-bold tracking-tight text-[#592612] dark:text-[#FFE3D6]">
              {timeLeft || "Calculating..."}
            </span>
          </div>
          
          <Link href="/select-plan">
            <Button
              size="sm"
              className="h-8 bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold text-xs rounded-lg px-4 shadow-sm transition-all border-none"
            >
              Subscribe now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}