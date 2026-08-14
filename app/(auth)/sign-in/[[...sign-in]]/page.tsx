"use client";
import { useUser, SignIn } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/logo";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import { ModeToggle } from "@/components/mode-toggle";

const ROLE_DESTINATIONS: Record<string, string> = {
  admin: "/dashboard",
  manager: "/dashboard",
  staff: "/inventory",
  supplier: "/reorders/purchase-orders",
};

export default function SignInPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const { resolvedTheme } = useTheme();

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden py-12 px-4 gap-8">
      {/* Background Animated Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1.2px,transparent_1.2px)] [background-size:36px_36px] opacity-[0.15] dark:opacity-[0.25]" />
        <div className="absolute top-[20%] left-[20%] w-[450px] h-[450px] rounded-full bg-indigo-600/15 dark:bg-indigo-600/20 blur-[140px] animate-float-slow" />
        <div className="absolute bottom-[20%] right-[20%] w-[450px] h-[450px] rounded-full bg-purple-600/15 dark:bg-purple-600/20 blur-[140px] animate-pulse-glow" />
      </div>

      {/* Top Floating Theme Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <ModeToggle />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md w-full">
        <Logo size="lg" href="/" />
        <SignIn
          appearance={{
            baseTheme: resolvedTheme === "dark" ? dark : undefined,
          }}
        />
      </div>
    </div>
  );
}