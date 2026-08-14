import { redirect } from "next/navigation";
import StockTransferClient from "./StockTransferClient";
import { getServerUser } from "@/lib/get-server-user";

export default async function TransferStockPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  return <StockTransferClient />;
}
