import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/get-server-user";
import { InsightsClient } from "./InsightsClient";

export const metadata = {
  title: "AI Insights | RetailMind AI",
  description: "Automated AI forecasting insights and alerts",
};

export default async function InsightsPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");
  
  const allowedRoles = ["super_admin", "admin", "manager"];
  if (!allowedRoles.includes(user.role)) redirect("/access-denied");

  return <InsightsClient />;
}
