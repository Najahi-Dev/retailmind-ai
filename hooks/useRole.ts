// hooks/useRole.ts
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";

export function useRole() {
  const { signOut } = useClerk();
  const { isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const user = useQuery(api.users.getCurrentUser);
  const storeUser = useMutation(api.users.storeUser);

  // ── AUTO STORE NEW CLERK USERS IN CONVEX ──
  useEffect(() => {
    if (isClerkLoaded && isSignedIn && user === null) {
      storeUser().catch((err) =>
        console.error("Automatic user store failed:", err)
      );
    }
  }, [isClerkLoaded, isSignedIn, user, storeUser]);

  // ── REAL-TIME SUSPENSION AUTO-LOGOUT ──
  useEffect(() => {
    if (isClerkLoaded && isSignedIn && user && user.isActive === false) {
      toast.error("Your account has been suspended by an administrator. Logging out...", {
        id: "suspended-logout",
        duration: 4000,
      });
      signOut({ redirectUrl: "/sign-in" });
    }
  }, [isClerkLoaded, isSignedIn, user, signOut]);

  return {
    user,
    role: user?.role ?? null,
    isLoading: user === undefined || !isClerkLoaded,
    isAdmin: user?.role === "admin",
    isManager: user?.role === "manager",
    isStaff: user?.role === "staff",
    isSupplier: user?.role === "supplier",
    isSuspended: user?.isActive === false,
  };
}