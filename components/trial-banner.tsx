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

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (trialStatus && trialStatus.isTrialExpired && !trialStatus.isSubscribed) {
      router.replace("/select-plan");
    }
  }, [trialStatus, router]);

  useEffect(() => {
    if (!trialStatus?.trialEndsAt || trialStatus.isSubscribed) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, trialStatus.trialEndsAt - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [trialStatus?.trialEndsAt, trialStatus?.isSubscribed]);

  if (!trialStatus || trialStatus.isSubscribed) {
    return null;
  }

  const { daysRemaining } = trialStatus;

  return (
    <div className="w-full px-4 pt-2.5 pb-1">
      <div className="w-full bg-[#FFF0E6] dark:bg-[#2D1A12] border border-[#FFD6C0] dark:border-[#5B301E] rounded-xl px-4 py-2.5 flex items-center justify-between shadow-xs transition-all flex-wrap gap-2">
        <div className="flex items-center gap-2.5 text-[#7A3E26] dark:text-[#FFC4AC] text-xs sm:text-sm font-medium">
          <ClockIcon className="size-4 text-[#C85A32] dark:text-[#FFA07A] shrink-0" />
          <span>
            <strong className="font-extrabold text-[#592612] dark:text-[#FFE3D6]">
              {daysRemaining} {daysRemaining === 1 ? "day" : "days"}
            </strong>{" "}
            left in your free trial.
          </span>
        </div>

        <div className="flex items-center gap-3">
          {timeLeft && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/80 dark:bg-black/30 border border-[#FFD6C0] dark:border-[#5B301E] text-xs font-mono font-bold text-[#7A3E26] dark:text-[#FFC4AC] shadow-2xs">
              <TimerIcon className="size-3.5 text-[#C85A32] dark:text-[#FFA07A] animate-pulse shrink-0" />
              <span>
                {String(timeLeft.days).padStart(2, "0")}d {String(timeLeft.hours).padStart(2, "0")}h {String(timeLeft.minutes).padStart(2, "0")}m {String(timeLeft.seconds).padStart(2, "0")}s
              </span>
            </div>
          )}

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
