"use client";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();

  // Getting role from Database
  const currentUser = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    // Not logged in → stay here
    if (!isSignedIn) return;

    // Still loading → wait
    if (currentUser === undefined) return;

    // Role check and redirect
    if (currentUser?.role === "admin")    router.replace("/dashboard");
    if (currentUser?.role === "manager")  router.replace("/dashboard");
    if (currentUser?.role === "staff")    router.replace("/inventory");
    if (currentUser?.role === "supplier") router.replace("/reorders/purchase-orders");

  }, [isSignedIn, currentUser]);

  return (
    <div className='flex items-center justify-center h-screen'>
      <SignIn />
    </div>
  );
}