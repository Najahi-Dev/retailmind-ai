// hooks/useWorkspaceBilling.ts
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { PLAN_CONFIG, PlanMetadata } from "@/constants/plans";

export function useWorkspaceBilling() {
  const { token, currentUser } = useAuth();

  const trialStatus = useQuery(api.organizations.getTrialStatus, {
    token: token ?? undefined,
  });

  const organization = useQuery(api.organizations.getCurrentOrganization, {
    token: token ?? undefined,
  });

  const isLoading = trialStatus === undefined || organization === undefined;

  // Resolve normalized tier strictly from workspace organization
  const rawTier = (
    trialStatus?.planTier ||
    organization?.planTier ||
    organization?.plan ||
    "STARTER"
  ).toUpperCase();

  const tier: "STARTER" | "GROWTH" | "ENTERPRISE" =
    rawTier === "GROWTH"
      ? "GROWTH"
      : rawTier === "ENTERPRISE"
      ? "ENTERPRISE"
      : "STARTER";

  const planConfig: PlanMetadata = PLAN_CONFIG[tier];

  const isSubscribed = trialStatus?.isSubscribed ?? false;
  const isTrialExpired = trialStatus?.isTrialExpired ?? false;
  const daysRemaining = trialStatus?.daysRemaining ?? 0;
  const isAdmin = currentUser?.role === "admin";

  const trialEndsFormatted = trialStatus?.trialEndsAt
    ? new Date(trialStatus.trialEndsAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

  const nextBillingFormatted = organization?.currentPeriodEnd
    ? new Date(organization.currentPeriodEnd).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

  return {
    organization,
    trialStatus,
    tier,
    planConfig,
    isSubscribed,
    isTrialExpired,
    daysRemaining,
    trialEndsAt: trialStatus?.trialEndsAt,
    trialEndsFormatted,
    nextBillingFormatted,
    currentPeriodEnd: organization?.currentPeriodEnd,
    isAdmin,
    isLoading,
  };
}
