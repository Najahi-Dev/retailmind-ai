import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";
import { getAuthUserRole } from "@/lib/auth-server";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = await getAuthUserRole(user);

  // Redirect staff users directly to inventory
  if (role === "staff") {
    redirect("/inventory");
  }

  // Redirect supplier users directly to purchase orders
  if (role === "supplier") {
    redirect("/reorders/purchase-orders");
  }

  return <DashboardClient />;
}