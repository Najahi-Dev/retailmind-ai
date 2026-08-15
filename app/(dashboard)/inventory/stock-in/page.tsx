import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/get-server-user";
import StockInClient from "./StockInClient";

export default async function StockInPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  return <StockInClient role={user.role} />;
}
