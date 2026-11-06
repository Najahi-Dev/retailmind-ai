"use client";
// Heavy client providers needed by the application (everything except the public
// landing page): Convex realtime client, auth/session, workspace context,
// tooltips and toasts. Loaded on demand by components/app-providers-gate.tsx.
import type { ReactNode } from "react";
import ConvexClientProvider from "@/lib/convex-client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ConvexClientProvider>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster />
    </ConvexClientProvider>
  );
}
