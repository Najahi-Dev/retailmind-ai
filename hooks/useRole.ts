// hooks/useRole.ts
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export function useRole() {
  const { isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const user = useQuery(api.users.getCurrentUser);
  const storeUser = useMutation(api.users.storeUser);

  useEffect(() => {
    if (isClerkLoaded && isSignedIn && user === null) {
      storeUser().catch((err) =>
        console.error("Automatic user store failed:", err)
      );
    }
  }, [isClerkLoaded, isSignedIn, user, storeUser]);

  return {
    user,
    role: user?.role ?? null,
    isLoading: user === undefined || !isClerkLoaded,
    isAdmin: user?.role === "admin",
    isManager: user?.role === "manager",
    isStaff: user?.role === "staff",
    isSupplier: user?.role === "supplier",
  };
}