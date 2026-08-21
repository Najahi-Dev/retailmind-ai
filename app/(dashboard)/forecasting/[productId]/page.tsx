import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/get-server-user";
import { ProductForecastClient } from "./ProductForecastClient";

export const metadata = {
  title: "Product Forecast | RetailMind AI",
  description: "Detailed AI demand forecast for product",
};

export default async function ProductForecastPage({ params }: { params: Promise<{ productId: string }> }) {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");
  
  const allowedRoles = ["super_admin", "admin", "manager"];
  if (!allowedRoles.includes(user.role)) redirect("/access-denied");

  const { productId } = await params;
  return <ProductForecastClient productId={productId} />;
}
