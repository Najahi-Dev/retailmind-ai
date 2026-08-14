import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";
import { getServerUser } from "@/lib/get-server-user";

export default async function DashboardPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  const role = user.role;

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