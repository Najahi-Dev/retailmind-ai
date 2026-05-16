"use client";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { SignIn } from "@clerk/nextjs";


const ROLE_DESTINATIONS: Record<string, string> = {
  admin: "/dashboard",
  manager: "/dashboard",
  staff: "/inventory",
  supplier: "/reorders/purchase-orders",
}

export default function SignInPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  // Getting role from Database
  const currentUser = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    // Clerk still loading → wait
    if (!isLoaded) return;

    // Not logged in → stay here
    if (!isSignedIn) return;

    // User data still loading → wait
    if (currentUser === undefined) return;

    // User not found in database (shouldn't happen, but handle it)
    if (!currentUser) {
      console.warn("User signed in but not found in database. Waiting for webhook sync...");
      return;
    }

    // Role check and redirect based on user role
    const role = currentUser.role;
    console.log("User logged in - Role: ", role);
    console.log("User data: ", currentUser);

    const destination = ROLE_DESTINATIONS[role] ?? "/dashboard";
    console.log("Redirecting to: ", destination);
    router.replace(destination);

  }, [isSignedIn, isLoaded, currentUser, router]);

  return (
    <div className='flex items-center justify-center h-screen'>
      <SignIn />
    </div>
  );
}