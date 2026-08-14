import { redirect } from "next/navigation";
import StockInEntryClient from "./StockInEntryClient";
import { getServerUser } from "@/lib/get-server-user";

export default async function AddInventoryPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  return <StockInEntryClient />;
}