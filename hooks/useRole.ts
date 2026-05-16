"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useRole() {

  // Database la current user info edukku
  const user = useQuery(api.users.getCurrentUser);

  // Easy to use shortcuts return pannrom
  return {
    user,

    role:      user?.role ?? null,
    // "admin" or "manager" or "staff" or "supplier"

    isLoading: user === undefined,
    // Still loading? true/false

    isAdmin:    user?.role === "admin",
    isManager:  user?.role === "manager",
    isStaff:    user?.role === "staff",
    isSupplier: user?.role === "supplier",
  };
}