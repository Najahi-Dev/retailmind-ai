import { redirect } from "next/navigation";
import StockAdjustmentClient from "./StockAdjustmentClient";
import { getServerUser } from "@/lib/get-server-user";

export default async function AdjustStockPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  return <StockAdjustmentClient />;
}
