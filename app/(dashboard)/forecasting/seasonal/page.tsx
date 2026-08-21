import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/get-server-user";
import { SeasonalClient } from "./SeasonalClient";

export const metadata = {
  title: "Seasonal Trends | RetailMind AI",
  description: "AI demand seasonality and YoY analysis",
};

export default async function SeasonalTrendsPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");
  
  const allowedRoles = ["super_admin", "admin", "manager"];
  if (!allowedRoles.includes(user.role)) redirect("/access-denied");

  return <SeasonalClient />;
}
