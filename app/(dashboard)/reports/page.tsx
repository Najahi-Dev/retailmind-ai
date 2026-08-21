import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/get-server-user";
import { ForecastAccuracyClient } from "./ForecastAccuracyClient";

export const metadata = {
  title: "Forecast Accuracy Report | RetailMind AI",
  description: "Evaluate AI demand forecasting model performance",
};

export default async function ForecastAccuracyReportPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");
  
  const allowedRoles = ["super_admin", "admin", "manager"];
  if (!allowedRoles.includes(user.role)) redirect("/access-denied");

  return <ForecastAccuracyClient />;
}
