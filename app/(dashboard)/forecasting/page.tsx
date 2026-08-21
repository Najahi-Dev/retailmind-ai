import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/get-server-user";
import { ForecastingClient } from "./ForecastingClient";

export const metadata = {
  title: "AI Forecasting | RetailMind AI",
  description: "AI demand forecasting and stock insights",
};

export default async function ForecastingPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");
  
  const allowedRoles = ["super_admin", "admin", "manager"];
  if (!allowedRoles.includes(user.role)) redirect("/access-denied");

  return <ForecastingClient />;
}
